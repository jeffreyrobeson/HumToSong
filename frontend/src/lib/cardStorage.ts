const STORAGE_KEY = "lll_music_cards";

export interface MusicCard {
	id: string;
	createdAt: number;
	thumbnailImage: string | null;
	audioUrl: string;
	musicId: string;
	genre: string;
	mood: string;
	tempo: number;
	description: string;
	tags: string[];
	confidence: number;
	reasoning: string;
	objects: string[];
	emotion: string;
	collaborators?: string[];
	isFavorite: boolean;
}

function readCards(): MusicCard[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw) as MusicCard[];
	} catch {
		return [];
	}
}

function writeCards(cards: MusicCard[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function getCards(): MusicCard[] {
	return readCards().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveCard(data: Omit<MusicCard, "id" | "createdAt" | "isFavorite">): MusicCard {
	const cards = readCards();
	const card: MusicCard = {
		...data,
		id: crypto.randomUUID(),
		createdAt: Date.now(),
		isFavorite: false,
	};
	cards.push(card);
	writeCards(cards);
	return card;
}

export function deleteCard(id: string): void {
	const cards = readCards().filter((c) => c.id !== id);
	writeCards(cards);
}

export function toggleFavorite(id: string): void {
	const cards = readCards();
	const card = cards.find((c) => c.id === id);
	if (card) {
		card.isFavorite = !card.isFavorite;
		writeCards(cards);
	}
}
