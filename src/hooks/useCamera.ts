import { useRef, useState, useEffect, useCallback } from 'react';

export const useCamera = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play().catch(err => console.warn("Video play error:", err));
            }
            setHasPermission(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setHasPermission(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setHasPermission(false);
        }
    };

    const captureFrame = useCallback((): string | null => {
        if (!videoRef.current) return null;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            // Return base64 string
            return canvas.toDataURL('image/jpeg', 0.8);
        }
        return null;
    }, []);

    useEffect(() => {
        return () => {
            stopCamera(); // Cleanup on unmount
        };
    }, []);

    return { videoRef, startCamera, stopCamera, captureFrame, hasPermission, stream };
};
