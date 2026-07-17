import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type MergeLayerInput, matchMusic, mergeLayersSmart } from "../lib/api";
import { useI18n } from "../lib/i18n";
import {
	createRoom,
	getOrCreateUserId,
	getOrCreateUserName,
	joinRoom,
	observeRoom,
	stopObserving,
} from "../lib/collaboration";
import { useAppStore } from "../stores/appStore";

type View = "lobby" | "join" | "room";

export default function CollabPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [view, setView] = useState<View>(searchParams.get("join") !== null ? "join" : "lobby");
	const [joinCode, setJoinCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [generating, setGenerating] = useState(false);

	const {
		roomCode,
		layers,
		objects,
		emotion,
		musicDescription,
		providerId,
		setRoomCode,
		setLayers,
		setCollabMode,
		setMatchResult,
		setMusicDescription,
		setLoading,
	} = useAppStore();

	const { t } = useI18n();

	const userName = getOrCreateUserName();

	// If we already have a room, show it
	useEffect(() => {
		if (roomCode) {
			setView("room");
			observeRoom(roomCode, (newLayers) => {
				setLayers(newLayers);
			});
		}
		return () => stopObserving();
	}, [roomCode, setLayers]);

	// Create room from current session data
	const handleCreateRoom = async () => {
		if (objects.length === 0 || !emotion) {
			navigate("/camera");
			return;
		}
		setError(null);
		try {
			const code = await createRoom({
				user_id: getOrCreateUserId(),
				user_name: userName,
				timestamp: Date.now(),
				objects,
				emotion,
				gemini_description: musicDescription,
				taps: useAppStore.getState().tapTimestamps,
			});
			setRoomCode(code);
			setCollabMode(true);
			setView("room");
		} catch (e) {
			setError(e instanceof Error ? e.message : t("collab.failedCreate"));
		}
	};

	// Join existing room
	const handleJoinRoom = async () => {
		const code = joinCode.trim().toUpperCase();
		if (code.length !== 6) {
			setError(t("collab.codeMust"));
			return;
		}
		setError(null);
		try {
			const roomData = await joinRoom(code);
			if (!roomData) {
				setError(t("collab.notFound"));
				return;
			}
			setRoomCode(code);
			setCollabMode(true);
			setView("room");
		} catch (e) {
			setError(e instanceof Error ? e.message : t("collab.failedJoin"));
		}
	};

	// Add my layer to the room
	const handleAddMyLayer = () => {
		// Navigate to camera flow, then come back
		navigate("/camera?collab=1");
	};

	// Generate combined music from all layers using Gemini smart merge
	const handleGenerateMix = async () => {
		if (layers.length === 0) return;
		setGenerating(true);
		setLoading(true);
		try {
			// Build merge input from layers
			const mergeInput: MergeLayerInput[] = layers.map((layer) => ({
				user_name: layer.user_name,
				objects: layer.objects,
				emotion: layer.emotion,
				gemini_description: layer.gemini_description ?? null,
			}));

			// Gemini-powered smart merge
			const mergeResult = await mergeLayersSmart(mergeInput, t("common.mergeError"), providerId ?? undefined);
			setMusicDescription(mergeResult.description);

			// Collect all objects from all layers for matching
			const allObjects = layers.flatMap((l) => l.objects);
			const avgEmotion = {
				emotion: mergeResult.description.mood,
				tempo: mergeResult.description.tempo,
				energy:
					mergeResult.description.energy_level === "high"
						? 0.8
						: mergeResult.description.energy_level === "medium"
							? 0.5
							: 0.3,
				regularity: 0.5,
				confidence: 0.8,
			};

			const result = await matchMusic(mergeResult.description, avgEmotion, allObjects, t("common.matchError"), providerId ?? undefined);
			setMatchResult(result);
			navigate("/result");
		} catch (e) {
			setError(e instanceof Error && e.message === "timeout" ? t("common.timeout") : (e instanceof Error ? e.message : t("collab.failedMix")));
		} finally {
			setGenerating(false);
			setLoading(false);
		}
	};

	const copyRoomCode = () => {
		if (roomCode) {
			navigator.clipboard.writeText(roomCode);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	// --- Lobby View ---
	if (view === "lobby") {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center px-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="w-full max-w-md text-center"
				>
					<h1 className="mb-2 text-3xl font-bold text-white/90">{t("collab.title")}</h1>
					<p className="mb-10 text-sm text-white/40">{t("collab.create")}</p>

					<div className="flex flex-col gap-4">
						<motion.button
							type="button"
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={handleCreateRoom}
							className="rounded-xl bg-neon-cyan/10 px-8 py-4 text-lg font-semibold text-neon-cyan ring-1 ring-neon-cyan/30 transition-all hover:bg-neon-cyan/20"
						>
							{t("collab.createRoom")}
						</motion.button>

						<motion.button
							type="button"
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={() => setView("join")}
							className="rounded-xl bg-neon-magenta/10 px-8 py-4 text-lg font-semibold text-neon-magenta ring-1 ring-neon-magenta/30 transition-all hover:bg-neon-magenta/20"
						>
							{t("collab.joinRoom")}
						</motion.button>
					</div>

					<button
						type="button"
						onClick={() => navigate("/")}
						className="mt-6 text-sm text-white/40 hover:text-white/60"
					>
						{t("collab.backToHome")}
					</button>
				</motion.div>
			</div>
		);
	}

	// --- Join View ---
	if (view === "join") {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center px-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="w-full max-w-md text-center"
				>
					<h2 className="mb-2 text-2xl font-bold text-white/90">{t("collab.joinTitle")}</h2>
					<p className="mb-8 text-sm text-white/40">{t("collab.enterCode")}</p>

					<input
						type="text"
						value={joinCode}
						onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
						placeholder="ABC123"
						maxLength={6}
						className="mb-4 w-full rounded-xl bg-bg-card px-6 py-4 text-center font-mono text-2xl tracking-[0.3em] text-white/90 ring-1 ring-white/10 placeholder:text-white/20 focus:outline-none focus:ring-neon-cyan/50"
					/>

					{error && <p className="mb-4 text-sm text-red-400">{error}</p>}

					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={handleJoinRoom}
						disabled={joinCode.length !== 6}
						className="w-full rounded-xl bg-neon-cyan/10 px-8 py-4 text-lg font-semibold text-neon-cyan ring-1 ring-neon-cyan/30 transition-all hover:bg-neon-cyan/20 disabled:opacity-30"
					>
						{t("collab.joinRoomBtn")}
					</motion.button>

					<button
						type="button"
						onClick={() => setView("lobby")}
						className="mt-4 text-sm text-white/40 hover:text-white/60"
					>
						{t("collab.back")}
					</button>
				</motion.div>
			</div>
		);
	}

	// --- Room View ---
	return (
		<div className="flex min-h-dvh flex-col items-center bg-bg-dark px-4 pt-8 pb-6">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full max-w-md"
			>
				{/* Room header */}
				<div className="mb-6 text-center">
					<p className="mb-1 text-sm text-white/40">{t("collab.roomCode")}</p>
					<button
						type="button"
						onClick={copyRoomCode}
						className="inline-flex items-center gap-2 rounded-lg bg-bg-card px-5 py-2 font-mono text-2xl tracking-[0.3em] text-neon-cyan ring-1 ring-neon-cyan/30 transition-all hover:ring-neon-cyan/60"
					>
						{roomCode}
						<span className="text-sm">{copied ? t("collab.copied") : t("collab.copy")}</span>
					</button>
					<p className="mt-2 text-xs text-white/30">{t("collab.shareCode")}</p>
				</div>

				{/* Layers list */}
				<div className="mb-6">
					<h3 className="mb-3 text-sm font-medium text-white/60">{t("collab.layers")} ({layers.length})</h3>
					{layers.length === 0 ? (
						<div className="rounded-xl bg-bg-card p-6 text-center ring-1 ring-white/5">
							<p className="text-sm text-white/30">{t("collab.noLayers")}</p>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{layers.map((layer, i) => (
								<motion.div
									key={layer.id}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: i * 0.1 }}
									className="rounded-xl bg-bg-card p-4 ring-1 ring-white/10"
								>
									<div className="mb-2 flex items-center justify-between">
										<span className="font-medium text-white/80">{layer.user_name}</span>
										<span className="text-xs text-white/30">{layer.objects.length} {t("collab.objects")}</span>
									</div>
									<div className="mb-2 flex flex-wrap gap-1.5">
										{layer.objects.map((obj) => (
											<span
												key={obj.id}
												className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/50"
											>
												{obj.name}
											</span>
										))}
									</div>
									{layer.emotion && (
										<p className="text-xs text-white/40">
											{layer.emotion.emotion} · {layer.emotion.tempo} BPM · Energy{" "}
											{Math.round(layer.emotion.energy * 100)}%
										</p>
									)}
								</motion.div>
							))}
						</div>
					)}
				</div>

				{error && <p className="mb-4 text-center text-sm text-red-400">{error}</p>}

				{/* Action buttons */}
				<div className="flex flex-col gap-3">
					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={handleAddMyLayer}
						className="rounded-xl bg-neon-cyan/10 px-8 py-3 font-semibold text-neon-cyan ring-1 ring-neon-cyan/30 transition-all hover:bg-neon-cyan/20"
					>
						{t("collab.addMyLayer")}
					</motion.button>

					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={handleGenerateMix}
						disabled={layers.length === 0 || generating}
						className="rounded-xl bg-neon-magenta/10 px-8 py-3 font-semibold text-neon-magenta ring-1 ring-neon-magenta/30 transition-all hover:bg-neon-magenta/20 disabled:opacity-30"
					>
						{generating ? t("play.generatingShort") : `${t("collab.generateMix")} (${layers.length} ${t("collab.layers")})`}
					</motion.button>
				</div>

				<button
					type="button"
					onClick={() => navigate("/")}
					className="mt-6 block w-full text-center text-sm text-white/40 hover:text-white/60"
				>
					{t("collab.leaveRoom")}
				</button>
			</motion.div>
		</div>
	);
}
