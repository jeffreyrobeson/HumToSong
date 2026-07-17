import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CameraPreview } from "../components/CameraPreview";
import { Card3DCarousel } from "../components/Card3DCarousel";
import { ChargeEffect } from "../components/ChargeEffect";
import { GestureParticles } from "../components/GestureParticles";
import { HandCursor } from "../components/HandCursor";
import { useHandGesture } from "../hooks/useHandGesture";
import { deleteCard, getCards, type MusicCard, toggleFavorite } from "../lib/cardStorage";
import type { GestureResult } from "../lib/gestureDetector";
import { getPlayableUrl } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useGestureStore } from "../stores/gestureStore";

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 300;
const CHARGE_DURATION = 1000;
const GESTURE_COOLDOWN = 500;

const MAX_SCROLL_SPEED = 0.2;
const CENTER_ZONE_LEFT = 0.33;
const CENTER_ZONE_RIGHT = 0.66;

const cardVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? 300 : -300,
		opacity: 0,
		scale: 0.95,
	}),
	center: {
		x: 0,
		opacity: 1,
		scale: 1,
	},
	exit: (direction: number) => ({
		x: direction > 0 ? -300 : 300,
		opacity: 0,
		scale: 0.95,
	}),
};

export default function CollectionPage() {
	const navigate = useNavigate();
	const [cards, setCards] = useState<MusicCard[]>(getCards);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [[direction], setDirection] = useState([0]);
	const [playingId, setPlayingId] = useState<string | null>(null);
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [playErrorId, setPlayErrorId] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	// Gesture state
	const { gestureEnabled, toggleGesture } = useGestureStore();
	const { t } = useI18n();
	const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
	const [currentGesture, setCurrentGesture] = useState<GestureResult["gesture"]>("none");
	const [gestureVelocity, setGestureVelocity] = useState(0);
	const [chargeProgress, setChargeProgress] = useState(0);
	const [isCharging, setIsCharging] = useState(false);

	// Refs for gesture timing
	const chargeStartRef = useRef(0);
	const lastGestureActionRef = useRef(0);
	const prevGestureRef = useRef<GestureResult["gesture"]>("none");

	const refresh = useCallback(() => {
		const updated = getCards();
		setCards(updated);
		if (currentIndex >= updated.length && updated.length > 0) {
			setCurrentIndex(updated.length - 1);
		}
	}, [currentIndex]);

	const paginate = useCallback(
		(newDirection: number) => {
			const next = currentIndex + newDirection;
			if (next < 0 || next >= cards.length) return;
			setDirection([newDirection]);
			setCurrentIndex(next);
		},
		[currentIndex, cards.length],
	);

	const handleDragEnd = (_: unknown, info: PanInfo) => {
		const { offset, velocity } = info;
		if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY) {
			paginate(1);
		} else if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY) {
			paginate(-1);
		}
	};

	const handlePlay = useCallback(
		(card: MusicCard) => {
			const audio = audioRef.current;
			if (!audio) return;
			// 同一张卡片: 切为暂停
			if (playingId === card.id) {
				audio.pause();
				setPlayingId(null);
				return;
			}
			if (loadingId === card.id) return; // 正在取链接, 防连击
			setPlayErrorId(null);
			setLoadingId(card.id);
			// vkey 有时效, 现取新鲜播放链接 (不再用本地缓存里会过期的 audioUrl); fire-and-forget
			getPlayableUrl(card.musicId)
				.then(async (freshUrl) => {
					audio.src = freshUrl;
					await audio.play();
					setPlayingId(card.id);
				})
				.catch((e) => {
					console.warn("play failed", e);
					setPlayErrorId(card.id);
					setPlayingId(null);
				})
				.finally(() => setLoadingId(null));
		},
		[playingId, loadingId],
	);

	const handleToggleFavorite = useCallback(
		(id: string) => {
			toggleFavorite(id);
			refresh();
		},
		[refresh],
	);

	const handleDelete = (id: string) => {
		if (playingId === id) {
			audioRef.current?.pause();
			setPlayingId(null);
		}
		deleteCard(id);
		refresh();
	};

	// Gesture callback
	const handleGesture = useCallback(
		(result: GestureResult) => {
			setCursorPos({ x: result.screenX, y: result.screenY });
			setCurrentGesture(result.gesture);

			const now = Date.now();
			const normalizedX = result.screenX / window.innerWidth;

			// Zone-based scrolling
			if (normalizedX < CENTER_ZONE_LEFT) {
				const intensity = (CENTER_ZONE_LEFT - normalizedX) / CENTER_ZONE_LEFT;
				setGestureVelocity(-intensity * MAX_SCROLL_SPEED);
			} else if (normalizedX > CENTER_ZONE_RIGHT) {
				const intensity = (normalizedX - CENTER_ZONE_RIGHT) / (1 - CENTER_ZONE_RIGHT);
				setGestureVelocity(intensity * MAX_SCROLL_SPEED);
			} else {
				setGestureVelocity(0);
			}

			// Pinch → start playing current card (with charge effect)
			if (result.gesture === "pinch") {
				if (!isCharging) {
					chargeStartRef.current = now;
					setIsCharging(true);
				}

				const elapsed = now - chargeStartRef.current;
				const progress = Math.min(elapsed / CHARGE_DURATION, 1);
				setChargeProgress(progress);

				if (progress >= 1 && now - lastGestureActionRef.current > GESTURE_COOLDOWN) {
					const card = cards[currentIndex];
					if (card && playingId !== card.id) {
						handlePlay(card);
					}
					lastGestureActionRef.current = now;
					setIsCharging(false);
					setChargeProgress(0);
				}
			} else {
				if (isCharging) {
					setIsCharging(false);
					setChargeProgress(0);
				}
			}

			// Open palm → stop music playback (continue scrolling via zone detection above)
			if (
				result.gesture === "open_palm" &&
				prevGestureRef.current !== "open_palm" &&
				playingId !== null
			) {
				const audio = audioRef.current;
				if (audio) {
					audio.pause();
					setPlayingId(null);
				}
			}

			prevGestureRef.current = result.gesture;
		},
		[cards, currentIndex, handlePlay, isCharging, playingId],
	);

	const { isLoading: gestureLoading } = useHandGesture({
		enabled: gestureEnabled,
		videoRef,
		onGestureDetected: handleGesture,
	});

	const card = cards[currentIndex] as MusicCard | undefined;

	return (
		<div className="flex min-h-dvh flex-col bg-bg-dark">
			{/* Header */}
			<div className="flex items-center justify-between px-5 pt-4 pb-2">
				<h1 className="text-xl font-bold text-white/90">My Collection</h1>
				<div className="flex items-center gap-3">
					<span className="text-xs text-white/30">
						{cards.length > 0 ? `${currentIndex + 1} / ${cards.length}` : ""}
					</span>
					{/* Gesture toggle */}
					<button
						type="button"
						onClick={toggleGesture}
						className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
							gestureEnabled
								? "bg-neon-cyan/20 text-neon-cyan ring-1 ring-neon-cyan/40"
								: "bg-white/5 text-white/30 ring-1 ring-white/10"
						}`}
						title={gestureEnabled ? "Disable gesture" : "Enable gesture"}
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							role="img"
							aria-label="Gesture control"
						>
							<path d="M18 11V6a2 2 0 0 0-4 0v1" />
							<path d="M14 10V4a2 2 0 0 0-4 0v2" />
							<path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
							<path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
						</svg>
					</button>
				</div>
			</div>

			{/* Gesture loading indicator */}
			{gestureEnabled && gestureLoading && (
				<div className="px-5 pb-1">
					<p className="text-xs text-neon-cyan/60">Loading hand detection...</p>
				</div>
			)}

			{/* Empty state */}
			{cards.length === 0 ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-1 flex-col items-center justify-center px-6"
				>
					<p className="mb-2 text-4xl">🎵</p>
					<p className="mb-1 text-white/60">No cards yet</p>
					<p className="mb-6 text-sm text-white/30">
						Create music and save it to build your collection
					</p>
					<motion.button
						type="button"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => navigate("/")}
						className="rounded-xl bg-neon-cyan/10 px-8 py-3 font-semibold text-neon-cyan ring-1 ring-neon-cyan/30"
					>
						Start Creating
					</motion.button>
				</motion.div>
			) : gestureEnabled ? (
				/* 3D Carousel mode */
				<>
					<Card3DCarousel
						cards={cards}
						currentIndex={currentIndex}
						onIndexChange={setCurrentIndex}
						onSelect={handlePlay}
						gestureVelocity={gestureVelocity}
						chargeProgress={chargeProgress}
					/>

					{/* Controls */}
					<div className="px-5 pt-3 pb-2">
						{card && (
							<>
								{/* Card info */}
								<div className="mb-2 text-center">
									<p className="text-lg font-bold text-white">{card.genre}</p>
									<p className="text-xs text-white/50">
										{card.mood} · {card.tempo} BPM
									</p>
								</div>
								<div className="flex items-center justify-center gap-4">
									<motion.button
										type="button"
										whileTap={{ scale: 0.85 }}
										onClick={() => handlePlay(card)}
										className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-cyan/20 text-lg text-neon-cyan ring-1 ring-neon-cyan/30"
									>
										{playingId === card.id ? "\u23F8" : "\u25B6"}
									</motion.button>
									<motion.button
										type="button"
										whileTap={{ scale: 0.85 }}
										onClick={() => handleToggleFavorite(card.id)}
										className={`flex h-10 w-10 items-center justify-center rounded-full text-sm ring-1 ${
											card.isFavorite
												? "bg-neon-yellow/20 text-neon-yellow ring-neon-yellow/30"
												: "bg-white/5 text-white/40 ring-white/10"
										}`}
									>
										{card.isFavorite ? "\u2605" : "\u2606"}
									</motion.button>
									<motion.button
										type="button"
										whileTap={{ scale: 0.85 }}
										onClick={() => handleDelete(card.id)}
										className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-sm text-red-400 ring-1 ring-red-500/20"
									>
										&#x2715;
									</motion.button>
								</div>
							</>
						)}
					</div>
				</>
			) : (
				/* Original swipe carousel mode */
				<>
					<div className="relative flex-1 overflow-hidden px-4">
						<AnimatePresence initial={false} custom={direction} mode="popLayout">
							{card && (
								<motion.div
									key={card.id}
									custom={direction}
									variants={cardVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{
										type: "spring",
										stiffness: 300,
										damping: 30,
									}}
									drag="x"
									dragConstraints={{ left: 0, right: 0 }}
									dragElastic={0.7}
									onDragEnd={handleDragEnd}
									className="absolute inset-x-4 top-0 bottom-0 cursor-grab active:cursor-grabbing"
								>
									<div className="relative h-full overflow-hidden rounded-2xl ring-1 ring-white/10">
										{card.thumbnailImage ? (
											<img
												src={card.thumbnailImage}
												alt=""
												className="h-full w-full object-cover"
												draggable={false}
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center bg-bg-card text-6xl">
												🎵
											</div>
										)}
										<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pt-20 pb-5">
											<p className="mb-1 text-2xl font-bold text-white">{card.genre}</p>
											<p className="mb-2 line-clamp-2 text-sm leading-relaxed text-white/70">
												{card.description}
											</p>
											<div className="flex items-center gap-3 text-xs text-white/50">
												<span>{card.mood}</span>
												<span className="text-white/20">·</span>
												<span>{card.tempo} BPM</span>
												<span className="text-white/20">·</span>
												<span>{Math.round(card.confidence * 10000) / 100}% match</span>
											</div>
											<div className="mt-2 flex gap-1.5">
												{card.tags.slice(0, 4).map((tag) => (
													<span
														key={tag}
														className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-white/60"
													>
														#{tag}
													</span>
												))}
											</div>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					<div className="px-5 pt-3 pb-2">
						{card && (
							<>
							<div className="flex items-center justify-center gap-4">
								<motion.button
									type="button"
									whileTap={{ scale: 0.85 }}
									onClick={() => handlePlay(card)}
									disabled={loadingId === card.id}
									className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-cyan/20 text-lg text-neon-cyan ring-1 ring-neon-cyan/30 disabled:opacity-50"
								>
									{loadingId === card.id ? "\u23F3" : playingId === card.id ? "\u23F8" : "\u25B6"}
								</motion.button>
								<motion.button
									type="button"
									whileTap={{ scale: 0.85 }}
									onClick={() => handleToggleFavorite(card.id)}
									className={`flex h-10 w-10 items-center justify-center rounded-full text-sm ring-1 ${
										card.isFavorite
											? "bg-neon-yellow/20 text-neon-yellow ring-neon-yellow/30"
											: "bg-white/5 text-white/40 ring-white/10"
									}`}
								>
									{card.isFavorite ? "\u2605" : "\u2606"}
								</motion.button>
								<motion.button
									type="button"
									whileTap={{ scale: 0.85 }}
									onClick={() => handleDelete(card.id)}
									className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-sm text-red-400 ring-1 ring-red-500/20"
								>
									&#x2715;
								</motion.button>
							</div>
							{playErrorId === card.id && (
								<p className="mt-1 text-center text-xs text-red-400/80">暂时没法播放，稍后再试</p>
							)}
							</>
						)}

						{cards.length > 1 && (
							<div className="mt-2 flex justify-center gap-1.5">
								{cards.map((c, i) => (
									<button
										key={c.id}
										type="button"
										onClick={() => {
											setDirection([i > currentIndex ? 1 : -1]);
											setCurrentIndex(i);
										}}
										className={`h-1.5 rounded-full transition-all ${
											i === currentIndex ? "w-4 bg-neon-cyan" : "w-1.5 bg-white/20"
										}`}
									/>
								))}
							</div>
						)}
					</div>
				</>
			)}

			{/* Gesture overlay layer */}
			{gestureEnabled && (
				<>
					<CameraPreview ref={videoRef} enabled={gestureEnabled} />
					<HandCursor
						x={cursorPos.x}
						y={cursorPos.y}
						gesture={currentGesture}
						visible={!gestureLoading}
					/>
					<ChargeEffect active={isCharging} progress={chargeProgress} />
					<GestureParticles
						active={isCharging}
						originX={window.innerWidth / 2}
						originY={window.innerHeight / 2}
						intensity={chargeProgress}
					/>
				</>
			)}

			<audio ref={audioRef} onEnded={() => setPlayingId(null)} />
		</div>
	);
}
