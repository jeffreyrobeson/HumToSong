import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteCard, getCards, type MusicCard, toggleFavorite } from "../lib/cardStorage";

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 300;

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
	const audioRef = useRef<HTMLAudioElement>(null);

	const refresh = () => {
		const updated = getCards();
		setCards(updated);
		if (currentIndex >= updated.length && updated.length > 0) {
			setCurrentIndex(updated.length - 1);
		}
	};

	const paginate = (newDirection: number) => {
		const next = currentIndex + newDirection;
		if (next < 0 || next >= cards.length) return;
		setDirection([newDirection]);
		setCurrentIndex(next);
	};

	const handleDragEnd = (_: unknown, info: PanInfo) => {
		const { offset, velocity } = info;
		if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY) {
			paginate(1);
		} else if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY) {
			paginate(-1);
		}
	};

	const handlePlay = (card: MusicCard) => {
		const audio = audioRef.current;
		if (!audio) return;
		if (playingId === card.id) {
			audio.pause();
			setPlayingId(null);
		} else {
			audio.src = card.audioUrl;
			audio.play();
			setPlayingId(card.id);
		}
	};

	const handleToggleFavorite = (id: string) => {
		toggleFavorite(id);
		refresh();
	};

	const handleDelete = (id: string) => {
		if (playingId === id) {
			audioRef.current?.pause();
			setPlayingId(null);
		}
		deleteCard(id);
		refresh();
	};

	const card = cards[currentIndex] as MusicCard | undefined;

	return (
		<div className="flex min-h-dvh flex-col bg-bg-dark">
			{/* Header */}
			<div className="flex items-center justify-between px-5 pt-4 pb-2">
				<h1 className="text-xl font-bold text-white/90">My Collection</h1>
				<span className="text-xs text-white/30">
					{cards.length > 0 ? `${currentIndex + 1} / ${cards.length}` : ""}
				</span>
			</div>

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
			) : (
				<>
					{/* Card carousel */}
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
									transition={{ type: "spring", stiffness: 300, damping: 30 }}
									drag="x"
									dragConstraints={{ left: 0, right: 0 }}
									dragElastic={0.7}
									onDragEnd={handleDragEnd}
									className="absolute inset-x-4 top-0 bottom-0 cursor-grab active:cursor-grabbing"
								>
									<div className="relative h-full overflow-hidden rounded-2xl ring-1 ring-white/10">
										{/* Image background */}
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

										{/* Gradient overlay with info */}
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

					{/* Controls */}
					<div className="px-5 pt-3 pb-2">
						{card && (
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
									\u2715
								</motion.button>
							</div>
						)}

						{/* Dot indicators */}
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

			<audio ref={audioRef} onEnded={() => setPlayingId(null)} />
		</div>
	);
}
