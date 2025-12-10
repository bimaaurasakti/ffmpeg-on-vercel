import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { unlink } from "fs/promises";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as Blob;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const inputFilePath = path.join(tmpdir(), "input_video.mp4");
  const outputFilePath = path.join(tmpdir(), "output_video.webm");

  // Save file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.promises.writeFile(inputFilePath, buffer);

  // Run FFmpeg to convert the video
  const ffmpegArgs = [
    "-i",
    inputFilePath,
    "-c:v",
    "libvpx-vp9", // Codec video untuk WebM
    "-c:a",
    "libopus", // Codec audio untuk WebM
    "-crf",
    "30", // Compression level (nilai lebih tinggi lebih cepat dengan kualitas lebih rendah)
    "-b:a", "96k", // Menetapkan bitrate audio untuk libopus
    "-preset", "medium", // Ubah preset untuk mempercepat proses
    "-y", // Menimpa file output yang ada
    outputFilePath,
  ];

  const ffmpeg = spawn("ffmpeg", ffmpegArgs);



  const stream = new ReadableStream({
    start(controller) {
      ffmpeg.stderr.on("data", (data) => {
        console.error("stderrData:", data.toString());
        controller.enqueue(data);
      });
      
      ffmpeg.on("close", async (code) => {
        if (code === 0) {
          controller.enqueue(
            Buffer.from(
              JSON.stringify({
                downloadUrl: `/api/download-video`
              })
            )
          );
        } 
        controller.close();
        await unlink(inputFilePath);
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Transfer-Encoding": "chunked",
    },
  });
}

export async function GET() {
  const videoPath = path.join(tmpdir(), "output_video.webm");
  const file = await fs.promises.readFile(videoPath);

  return new Response(file, {
    status: 200,
    headers: {
      "Content-Type": "video/webm",
    },
  });
}
