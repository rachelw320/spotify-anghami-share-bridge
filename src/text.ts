export interface TrackQuery {
	title: string;
	artist: string;
}

// Matches the text anghami gives you when you share a song, e.g.
// Listen to “Howa Enta Meen” by Angham on Anghami https://open.anghami.com/...
const ANGHAMI_SHARE_PATTERN = /Listen to\s+[“"](.+?)[”"]\s+by\s+(.+?)\s+on Anghami/i;

/** Pulls the title and artist out of anghami's share text, or returns null if it doesn't match */
export function parseAnghamiShareText(share: string): TrackQuery | null {
	const match = share.match(ANGHAMI_SHARE_PATTERN);
	if (!match) {
		return null;
	}
	return { title: match[1].trim(), artist: match[2].trim() };
}

/** Lowercases and strips accents and punctuation so we can compare titles loosely, e.g. "Beyoncé" -> "beyonce". */
export function normalise(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();
}

/** Swaps ellipses ("..." or "…") in a title for a single space so the whatsapp message looks tidier */
export function cleanTrackTitle(title: string): string {
	return title
		.replace(/\s*(?:\.{2,}|…+)\s*/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}
