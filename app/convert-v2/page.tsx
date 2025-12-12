"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState("");
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [message, setMessage] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [progress, setProgress] = useState(0);
    
    // JANGAN langsung new FFmpeg() di sini
    const ffmpegRef = useRef<FFmpeg | null>(null);

    useEffect(() => {
        // safeguard, walaupun useEffect cuma jalan di client
        if (typeof window === "undefined") return;

        console.log('start client')

        const load = async () => {
            const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd'

            if (!ffmpegRef.current) {
                ffmpegRef.current = new FFmpeg();
            }
            
            const ffmpeg = ffmpegRef.current;
            
            // Listen to progress event instead of log.
            ffmpeg.on('progress', ({ progress, time }) => {
                const msg = `${(progress * 100).toFixed(2)} % (transcoded time: ${(time / 1000000).toFixed(2)} s)`;
                console.log(msg);
                setMessage(msg);
                setProgress(progress * 100);
            });

            try {
                // toBlobURL is used to bypass CORS issue, urls with the same
                // domain can be used directly.
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
                console.log('masuk 4');
                setIsLoaded(true);
                console.log("FFmpeg loaded");
            } catch (err) {
                console.error("Failed loading FFmpeg", err);
            }
        };

        load();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setVideoFile(file);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoFile) return;
        if (!ffmpegRef.current || !isLoaded) {
            console.warn("FFmpeg belum siap");
            return;
        }

        setLoading(true);
        setDownloadUrl("");
        const ffmpeg = ffmpegRef.current;

        try {
            // Tulis file ke FS virtual
            await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

            // Jalankan konversi
            await ffmpeg.exec([
                "-i",
                "input.mp4",
                "-c:v",
                "libx264",
                "-crf",
                "23",
                "-preset",
                "medium",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "output.mp4",
            ]); 

            const data = await ffmpeg.readFile('output.mp4') as Uint8Array;

            const videoBlob = new Blob([new Uint8Array(data)], { type: "video/mp4" });
            const url = URL.createObjectURL(videoBlob);

            setVideoUrl(url);
            setDownloadUrl(url);

            // const videoBlob = new Blob([data.buffer], { type: "video/mp4" });
            // const url = URL.createObjectURL(videoBlob);
            // setDownloadUrl(url);
        } catch (err) {
            console.error("Error during processing", err);
        } finally {
            // setLoading(false);
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
                        {videoUrl && (
                            <video src={videoUrl!} controls></video>
                        )}
                        <br />
                        <input
                            type="file"
                            accept="video/*"
                            className="w-full text-sm text-muted-foreground"
                            onChange={handleFileChange}
                            required
                        />
                        <Button className="w-full" type="submit" disabled={loading || !videoFile || !isLoaded}>
                            {loading ? "Processing..." : "Upload & Convert"}
                        </Button>
                    </form>

                    {loading && (
                        <div className="space-y-2">
                            <p className="text-sm text-center">{ message }</p>
                            <Progress value={progress} />
                        </div>
                    )}

                    {downloadUrl && (
                        <div className="text-center">
                            <p className="text-sm">Finished!</p>
                            <a
                                href={downloadUrl}
                                download="output.mp4"
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
