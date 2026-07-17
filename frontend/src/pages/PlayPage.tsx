import { motion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { analyzeEmotion } from "../lib/emotionAnalyzer";
import { useI18n } from "../lib/i18n";
import { playMaterialSound } from "../lib/soundEngine";
import { useAppStore } from "../stores/appStore";

const EMOTION_EMOJI: Record<string, string> = {
	calm: "😌",
	focused: "🎯",
	excited: "🔥",
	anxious: "😰",
	melancholic: "🌙",
	contemplative: "🤔",
	neutral: "😐",
};

export default function PlayPage() {
	const navigate = useNavigate();
	const { t } = useI18n();
	const [searchParams] = useSearchParams();
	const isCollab = searchParams.get("collab") !== null;
	const { objects, tapTimestamps, emotion, addTap, setEmotion } = useAppStore();
	const startTimeRef = useRef<number | null>(null);

	// Redirect if no objects
	useEffect(() => {
		if (objects.length === 0) navigate("/camera");
	}, [objects, navigate]);

	// Recalculate emotion on each tap
	useEffect(() => {
		if (tapTimestamps.length >= 3) {
			setEmotion(analyzeEmotion(tapTimestamps));
		}
	}, [tapTimestamps, setEmotion]);

	const handleTap = useCallback(
		(material: string) => {
			const now = performance.now() / 1000;
			if (!startTimeRef.current) startTimeRef.current = now;
			addTap(now - startTimeRef.current);
			playMaterialSound(material);
		},
		[addTap],
	);

	const handleGenerate = () => {
		if (!emotion) return;
		navigate(isCollab ? "/result?collab=1" : "/result");
	};

	return (
		<div className="flex min-h-dvh flex-col items-center bg-bg-dark px-4 pt-10">
			<h2 className="mb-2 text-xl font-semibold text-white/80">{t("play.tapToPlay")}</h2>
			<p className="mb-6 text-sm text-white/40">{t("play.tapHint")}</p>

			{/* Object cards */}
			<div className="mb-6 flex flex-wrap justify-center gap-3">
				{objects.map((obj, i) => (
					<motion.button
						key={obj.id}
						type="button"
						whileTap={{ scale: 0.85, boxShadow: "0 0 20px rgba(0,255,255,0.4)" }}
						onClick={() => handleTap(obj.material)}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.1 }}
						className="flex flex-col items-center rounded-xl bg-bg-card px-5 py-4 ring-1 ring-white/10 transition-all active:ring-neon-cyan/50"
					>
						<span className="mb-1 text-2xl">🎵</span>
						<span className="text-sm font-medium text-white/80">{obj.name}</span>
						<span className="text-xs text-white/40">{obj.material}</span>
					</motion.button>
				))}
			</div>

			{/* Tap counter and emotion display */}
			<div className="mb-6 text-center">
				<p className="text-sm text-white/50">
					{t("play.taps")}: <span className="font-mono text-neon-cyan">{tapTimestamps.length}</span>
				</p>
				{emotion && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="mt-3 rounded-xl bg-bg-card px-6 py-4 ring-1 ring-white/10"
					>
						<p className="mb-1 text-2xl">{EMOTION_EMOJI[emotion.emotion] ?? "🎵"}</p>
						<p className="text-sm font-medium capitalize text-white/80">{emotion.emotion}</p>
						<p className="mt-1 text-xs text-white/40">
							{emotion.tempo} BPM · Energy {Math.round(emotion.energy * 100)}%
						</p>
					</motion.div>
				)}
			</div>

			{/* Generate button */}
			<motion.button
				type="button"
				whileHover={{ scale: 1.03 }}
				whileTap={{ scale: 0.95 }}
				onClick={handleGenerate}
				disabled={!emotion}
				className="rounded-xl bg-neon-magenta/10 px-8 py-3 font-semibold text-neon-magenta ring-1 ring-neon-magenta/30 transition-all hover:bg-neon-magenta/20 disabled:opacity-30"
			>
				{t("play.generateMusic")}
			</motion.button>

			<button
				type="button"
				onClick={() => navigate("/camera")}
				className="mt-4 text-sm text-white/40 hover:text-white/60"
			>
				{t("play.retake")}
			</button>
		</div>
	);
}
