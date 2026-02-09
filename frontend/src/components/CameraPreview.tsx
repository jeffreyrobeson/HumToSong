import { forwardRef, useEffect, useRef } from "react";

interface CameraPreviewProps {
	enabled: boolean;
}

export const CameraPreview = forwardRef<HTMLVideoElement, CameraPreviewProps>(
	function CameraPreview({ enabled }, ref) {
		const internalRef = useRef<HTMLVideoElement>(null);
		const videoRef = (ref as React.RefObject<HTMLVideoElement>) ?? internalRef;
		const streamRef = useRef<MediaStream | null>(null);

		useEffect(() => {
			if (!enabled) {
				if (streamRef.current) {
					for (const track of streamRef.current.getTracks()) track.stop();
					streamRef.current = null;
				}
				return;
			}

			let cancelled = false;

			async function start() {
				try {
					const stream = await navigator.mediaDevices.getUserMedia({
						video: { width: 320, height: 240, facingMode: "user" },
					});
					if (cancelled) {
						for (const track of stream.getTracks()) track.stop();
						return;
					}
					streamRef.current = stream;
					if (videoRef.current) {
						videoRef.current.srcObject = stream;
					}
				} catch {
					// Camera permission denied - fail silently
				}
			}

			start();

			return () => {
				cancelled = true;
				if (streamRef.current) {
					for (const track of streamRef.current.getTracks()) track.stop();
					streamRef.current = null;
				}
			};
		}, [enabled, videoRef]);

		if (!enabled) return null;

		return (
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				className="fixed right-4 bottom-20 z-40 h-[120px] w-[160px] -scale-x-100 rounded-xl object-cover opacity-60 ring-1 ring-neon-cyan/30"
			/>
		);
	},
);
