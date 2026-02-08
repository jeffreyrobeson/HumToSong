import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AudioVisualizer from "../components/AudioVisualizer";
import { generateDescription, matchMusic } from "../lib/api";
import { saveCard } from "../lib/cardStorage";
import { addLayer, createRoom, getOrCreateUserId, getOrCreateUserName } from "../lib/collaboration";
import { useAppStore } from "../stores/appStore";

export default function ResultPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const audioRef = useRef<HTMLAudioElement>(null);
	const [playing, setPlaying] = useState(false);
	const [loadingStep, setLoadingStep] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	const {
		objects,
		emotion,
		capturedImage,
		matchResult,
		musicDescription,
		isCollabMode,
		roomCode,
		tapTimestamps,
		setMusicDescription,
		setMatchResult,
		setLoading,
		setRoomCode,
		setCollabMode,
	} = useAppStore();

	const isCollab = searchParams.get("collab") !== null;

	// Redirect if no data
	useEffect(() => {
		if (objects.length === 0 || !emotion) {
			navigate("/camera");
			return;
		}
		if (matchResult) return;

		const run = async () => {
			setLoading(true);
			try {
				setLoadingStep("Generating music description...");
				const desc = await generateDescription(objects, emotion);
				setMusicDescription(desc);

				setLoadingStep("Matching music...");
				const result = await matchMusic(desc, emotion, objects);
				setMatchResult(result);
			} catch (e) {
				console.error("Pipeline error:", e);
				setLoadingStep(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
			} finally {
				setLoading(false);
			}
		};
		run();
	}, [objects, emotion, matchResult, setMusicDescription, setMatchResult, setLoading, navigate]);

	// If in collab flow, auto-submit layer and go back to collab page
	useEffect(() => {
		if (isCollab && matchResult && roomCode && musicDescription) {
			addLayer(roomCode, {
				user_id: getOrCreateUserId(),
				user_name: getOrCreateUserName(),
				timestamp: Date.now(),
				objects,
				emotion: emotion!,
				gemini_description: musicDescription,
				taps: tapTimestamps,
			}).then(() => {
				navigate("/collab");
			});
		}
	}, [
		isCollab,
		matchResult,
		roomCode,
		musicDescription,
		objects,
		emotion,
		tapTimestamps,
		navigate,
	]);

	const togglePlay = () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (playing) {
			audio.pause();
		} else {
			audio.play();
		}
		setPlaying(!playing);
	};

	const handleSaveCard = () => {
		if (!matchResult || !musicDescription) return;
		saveCard({
			thumbnailImage: capturedImage,
			audioUrl: matchResult.audio_url,
			musicId: matchResult.music_id,
			genre: musicDescription.genre,
			mood: musicDescription.mood,
			tempo: musicDescription.tempo,
			description: musicDescription.description,
			tags: musicDescription.matching_tags,
			confidence: matchResult.confidence,
			reasoning: matchResult.reasoning,
			objects: objects.map((o) => o.name),
			emotion: emotion?.emotion ?? "unknown",
			collaborators: isCollabMode ? [] : undefined,
		});
		setSaved(true);
	};

	const handleInviteFriends = async () => {
		if (!emotion) return;
		try {
			const code = await createRoom({
				user_id: getOrCreateUserId(),
				user_name: getOrCreateUserName(),
				timestamp: Date.now(),
				objects,
				emotion,
				gemini_description: musicDescription,
				taps: tapTimestamps,
			});
			setRoomCode(code);
			setCollabMode(true);
			navigate("/collab");
		} catch (e) {
			console.error("Failed to create room:", e);
		}
	};

	if (!matchResult) {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center">
				<motion.div
					animate={{ rotate: 360 }}
					transition={{
						repeat: Number.POSITIVE_INFINITY,
						duration: 2,
						ease: "linear",
					}}
					className="mb-4 h-8 w-8 rounded-full border-2 border-neon-cyan border-t-transparent"
				/>
				<p className="text-sm text-white/60">{loadingStep ?? "Processing..."}</p>
			</div>
		);
	}

	return (
		<div className="flex min-h-dvh flex-col items-center bg-bg-dark px-4 pt-10 pb-8">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full max-w-md"
			>
				<h2 className="mb-6 text-center text-xl font-semibold text-white/80">Your Music</h2>

				{/* Music info card */}
				<div className="mb-6 rounded-2xl bg-bg-card p-6 ring-1 ring-white/10">
					{musicDescription && (
						<>
							<p className="mb-1 text-lg font-semibold text-neon-cyan">{musicDescription.genre}</p>
							<p className="mb-3 text-sm text-white/50">{musicDescription.description}</p>
							<div className="mb-3 flex flex-wrap gap-2">
								{musicDescription.matching_tags.map((tag) => (
									<span
										key={tag}
										className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60"
									>
										#{tag}
									</span>
								))}
							</div>
						</>
					)}

					<div className="mb-4 grid grid-cols-3 gap-3 text-center text-xs text-white/50">
						<div>
							<p className="font-mono text-lg text-neon-magenta">
								{Math.round(matchResult.confidence * 10000) / 100}%
							</p>
							<p>Confidence</p>
						</div>
						<div>
							<p className="font-mono text-lg text-neon-yellow">{musicDescription?.tempo ?? "?"}</p>
							<p>BPM</p>
						</div>
						<div>
							<p className="font-mono text-lg text-neon-cyan">{emotion?.emotion ?? "?"}</p>
							<p>Mood</p>
						</div>
					</div>

					<p className="text-xs text-white/30">{matchResult.reasoning}</p>

					{/* Gemini creative reason */}
					{matchResult.creative_reason && (
						<p className="mt-3 border-t border-white/5 pt-3 text-sm leading-relaxed text-neon-cyan/70 italic">
							{matchResult.creative_reason}
						</p>
					)}

					{/* Poetic story */}
					{matchResult.story && (
						<p className="mt-3 border-t border-white/5 pt-3 text-sm leading-relaxed text-white/60">
							{matchResult.story}
						</p>
					)}
				</div>

				{/* Audio player */}
				<div className="mb-6 flex justify-center">
					<motion.button
						type="button"
						whileTap={{ scale: 0.9 }}
						onClick={togglePlay}
						className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-cyan/20 text-2xl text-neon-cyan ring-2 ring-neon-cyan/40 transition-all hover:bg-neon-cyan/30"
					>
						{playing ? "\u23F8" : "\u25B6"}
					</motion.button>
				</div>
				<AudioVisualizer audioElement={audioRef.current} isPlaying={playing} />
				<audio ref={audioRef} src={matchResult.audio_url} onEnded={() => setPlaying(false)} />

				{/* Actions */}
				<div className="flex flex-col gap-3">
					<div className="flex justify-center gap-3">
						<button
							type="button"
							onClick={handleSaveCard}
							disabled={saved}
							className="rounded-lg bg-neon-yellow/10 px-5 py-2 text-sm font-medium text-neon-yellow ring-1 ring-neon-yellow/30 transition-all hover:bg-neon-yellow/20 disabled:opacity-50"
						>
							{saved ? "Saved!" : "Save to Collection"}
						</button>
						<button
							type="button"
							onClick={handleInviteFriends}
							className="rounded-lg bg-neon-magenta/10 px-5 py-2 text-sm font-medium text-neon-magenta ring-1 ring-neon-magenta/30 transition-all hover:bg-neon-magenta/20"
						>
							Invite Friends
						</button>
					</div>

					<div className="flex justify-center gap-3">
						<button
							type="button"
							onClick={() => {
								setMatchResult(null as never);
								setMusicDescription(null as never);
							}}
							className="rounded-lg bg-white/5 px-5 py-2 text-sm text-white/60 hover:bg-white/10"
						>
							Regenerate
						</button>
						<button
							type="button"
							onClick={() => navigate("/")}
							className="rounded-lg bg-white/5 px-5 py-2 text-sm text-white/60 hover:bg-white/10"
						>
							New Session
						</button>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
