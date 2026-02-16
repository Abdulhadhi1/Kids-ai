'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Camera } from 'lucide-react';

export const CameraView = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setHasPermission(true);
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setHasPermission(false);
            }
        };

        startCamera();

        return () => {
            // Cleanup: stop tracks
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    if (hasPermission === false) {
        return (
            <div className="w-full h-64 bg-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
                <Camera size={48} />
                <p>Camera access unavailable.</p>
                {typeof window !== 'undefined' && !window.isSecureContext && (
                    <p className="text-xs text-red-500 font-bold max-w-xs">
                        ⚠️ App must be on HTTPS (Secure) or Localhost to use the camera.
                    </p>
                )}
                <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                >
                    Retry Camera
                </button>
            </div>
        );
    }

    return (
        <div className="w-full relative rounded-3xl overflow-hidden shadow-inner border-4 border-white/50 aspect-[4/3] bg-black">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
            />
            {/* Overlay for "Learning Mode" feel */}
            <div className="absolute top-2 right-2 bg-black/30 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                Live View
            </div>
        </div>
    );
};
