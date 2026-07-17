import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { identifyObjects } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useAppStore } from "../stores/appStore";

export default function CameraPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const isCollab = searchParams.get("collab") !== null;
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [streaming, setStreaming] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { setCapturedImage, setObjects, isLoading, setLoading, providerId } = useAppStore();
	const { t } = useI18n();

	const startCamera = useCallback(async () => {
		// 后摄失败(双摄/旧机/某些 webview)时，自动 fallback 到任意/前摄，
		// 避免在香港/国内 app webview 或环境相机不可用时直接打不开。
		const tryGetUserMedia = async (constraints: MediaStreamConstraints) =>
			navigator.mediaDevices.getUserMedia(constraints);

		try {
			let stream: MediaStream | undefined;
			try {
				stream = await tryGetUserMedia({
					video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
				});
			} catch {
				// 后摄不可用 -> 退回默认/前置
				stream = await tryGetUserMedia({ video: true });
			}
			if (videoRef.current && stream) {
				videoRef.current.srcObject = stream;
				setStreaming(true);
			}
		} catch (e) {
			const name = e instanceof DOMException ? e.name : "";
			let msg = t("camera.failed");
			if (name === "NotAllowedError" || name === "SecurityError") {
				msg = t("camera.denied");
			} else if (name === "NotFoundError" || name === "OverconstrainedError") {
				msg = t("camera.noCamera");
			} else if (name === "NotReadableError") {
				msg = t("camera.busy");
			}
			setError(msg);
		}
	}, [t]);

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
			const objects = await identifyObjects(base64, t("common.identifyError"), providerId ?? undefined);
			setObjects(objects);
			navigate(isCollab ? "/play?collab=1" : "/play");
		} catch (e) {
			setError(e instanceof Error && e.message === "timeout" ? t("common.timeout") : (e instanceof Error ? e.message : t("camera.identifyFailed")));
		} finally {
			setLoading(false);
		}
	}, [setCapturedImage, setObjects, setLoading, navigate, isCollab, t, providerId]);

	return (
		<div className="flex min-h-dvh flex-col items-center bg-bg-dark px-4 pt-12">
			<h2 className="mb-6 text-xl font-semibold text-white/80">{t("camera.title")}</h2>

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
							{t("camera.open")}
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
					{isLoading ? t("camera.identifying") : t("camera.capture")}
				</motion.button>
			)}

			<button
				type="button"
				onClick={() => navigate("/")}
				className="mt-4 text-sm text-white/40 hover:text-white/60"
			>
				{t("camera.back")}
			</button>
		</div>
	);
}
