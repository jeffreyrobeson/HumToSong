import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { identifyObjects } from "../lib/api";
import { useAppStore } from "../stores/appStore";

export default function CameraPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const isCollab = searchParams.get("collab") !== null;
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [streaming, setStreaming] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { setCapturedImage, setObjects, isLoading, setLoading } = useAppStore();

	const startCamera = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
			});
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				setStreaming(true);
			}
		} catch {
			setError("Camera access denied. Please allow camera permissions.");
		}
	}, []);

	const captureAndIdentify = useCallback(async () => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.drawImage(video, 0, 0);
		const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
		const base64 = dataUrl.split(",")[1];

		setCapturedImage(dataUrl);
		setLoading(true);

		try {
			const objects = await identifyObjects(base64);
			setObjects(objects);
			navigate(isCollab ? "/play?collab=1" : "/play");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Identification failed");
		} finally {
			setLoading(false);
		}
	}, [setCapturedImage, setObjects, setLoading, navigate, isCollab]);

	return (
		<div className="flex min-h-dvh flex-col items-center bg-bg-dark px-4 pt-12">
			<h2 className="mb-6 text-xl font-semibold text-white/80">Capture Your Scene</h2>

			{error && <p className="mb-4 text-sm text-error">{error}</p>}

			<div className="relative mb-6 w-full max-w-md overflow-hidden rounded-2xl border border-white/10">
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					className="aspect-[4/3] w-full bg-bg-card object-cover"
				/>
				{!streaming && (
					<div className="absolute inset-0 flex items-center justify-center">
						<motion.button
							type="button"
							whileTap={{ scale: 0.9 }}
							onClick={startCamera}
							className="rounded-lg bg-neon-cyan/20 px-6 py-3 text-neon-cyan ring-1 ring-neon-cyan/40"
						>
							Open Camera
						</motion.button>
					</div>
				)}
			</div>

			<canvas ref={canvasRef} className="hidden" />

			{streaming && (
				<motion.button
					type="button"
					whileTap={{ scale: 0.9 }}
					onClick={captureAndIdentify}
					disabled={isLoading}
					className="rounded-xl bg-neon-cyan px-8 py-3 font-semibold text-bg-dark transition-opacity disabled:opacity-50"
				>
					{isLoading ? "Identifying..." : "Capture & Identify"}
				</motion.button>
			)}

			<button
				type="button"
				onClick={() => navigate("/")}
				className="mt-4 text-sm text-white/40 hover:text-white/60"
			>
				Back
			</button>
		</div>
	);
}
