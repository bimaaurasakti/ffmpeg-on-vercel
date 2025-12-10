"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setProgress(0);

    const formData = new FormData();
    const fileInput = document.getElementById("video-file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
      alert("No file selected");
      setLoading(false);
      return;
    }

    formData.append("file", file);

    try {
      const response = await fetch("/convert", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("Content-Type");
      const streamResponse = response.clone();

      const reader = streamResponse.body?.getReader();
      let receivedSize = 0;

      if (reader) {
        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) {
            setProgress(100);
            return;
          }

          receivedSize += value.length;
          // kita tidak punya total size → buat progress dummy
          setProgress(Math.min(receivedSize / 50000 * 100, 99)); // dummy

          pump();
        };
        pump();
      }

      const result = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();
      console.log("downloadUrl: ", result.downloadUrl);

      const getVideo = await fetch("/convert", {
        method: "GET",
      });

      const video = await getVideo.blob();
      const videoUrl = URL.createObjectURL(video);
      setDownloadUrl(videoUrl);
    } catch (error) {
      console.error(error);
      alert("Error during video conversion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-muted">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="space-y-6">

          <h1 className="text-xl font-semibold text-center mt-6">
            Upload & Convert Your Video
          </h1>

          <form onSubmit={handleUpload} className="space-y-3">
            <input
              type="file"
              id="video-file"
              accept="video/*"
              className="w-full text-sm text-muted-foreground"
              required
            />

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Processing..." : "Upload & Convert"}
            </Button>
          </form>

          {/* progress bar */}
          {loading && (
            <div className="space-y-2">
              <p className="text-sm text-center">Converting video...</p>
              <Progress value={progress} />
            </div>
          )}

          {/* result */}
          {downloadUrl && (
            <div className="text-center">
              <p className="text-sm">Finished!</p>
              <a
                href={downloadUrl}
                download
                className="text-primary font-medium underline"
              >
                Download video
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
