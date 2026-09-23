import { normalise, type TrackQuery } from './text';

const SPOTIFY_MARKET = 'GB';
const SEARCH_RESULT_LIMIT = 10;
// Refresh the token a minute before spotify says it expires, just to be safe
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

export interface SpotifyCredentials {
	clientId: string;
	clientSecret: string;
}

export interface SpotifyTrack {
	name: string;
	artists: { name: string }[];
	external_urls: { spotify: string };
}

interface SpotifyTokenResponse {
	access_token: string;
	expires_in: number;
}

interface SpotifySearchResponse {
	tracks: { items: SpotifyTrack[] };
}

// Keeps the token around between requests (while the worker's still warm) so we're not asking spotify for a new one every time.
let cachedToken: { token: string; expiresAt: number } | null = null;

/** Gets an access token with the client credentials flow, or reuses the cached one if it's still valid. */
async function getAccessToken({ clientId, clientSecret }: SpotifyCredentials): Promise<string> {
	if (cachedToken && cachedToken.expiresAt > Date.now() + TOKEN_EXPIRY_MARGIN_MS) {
		return cachedToken.token;
	}

	const response = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: 'grant_type=client_credentials',
	});

	if (!response.ok) {
		throw new Error(`Couldn't log in to spotify (status ${response.status}), soz`);
	}

	const data = (await response.json()) as SpotifyTokenResponse;
	cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
	return data.access_token;
}

/** Searches spotify for the track and returns the best match */
export async function searchSpotifyTrack(query: TrackQuery, credentials: SpotifyCredentials): Promise<SpotifyTrack | null> {
	const token = await getAccessToken(credentials);

	const params = new URLSearchParams({
		q: `${query.title} ${query.artist}`,
		type: 'track',
		market: SPOTIFY_MARKET,
		limit: String(SEARCH_RESULT_LIMIT),
	});

	const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		throw new Error(`Spotify search failed with status ${response.status} :(`);
	}

	const data = (await response.json()) as SpotifySearchResponse;
	return chooseBestMatch(data.tracks.items, query);
}

/** 6 points for an exact match, 3 if one contains the other, 0 if they're nothing alike. */
function similarityScore(candidate: string, wanted: string): number {
	if (candidate === wanted) {
		return 6;
	}
	if (candidate.includes(wanted) || wanted.includes(candidate)) {
		return 3;
	}
	return 0;
}

/**
 * Picks the track whose title and artists match best.
 * If there's a tie the earlier one wins, so spotify's own ordering still counts
 */
export function chooseBestMatch(tracks: SpotifyTrack[], query: TrackQuery): SpotifyTrack | null {
	const wantedTitle = normalise(query.title);
	const wantedArtist = normalise(query.artist);

	let bestTrack: SpotifyTrack | null = null;
	let bestScore = -1;

	for (const track of tracks) {
		const score =
			similarityScore(normalise(track.name), wantedTitle) + similarityScore(normalise(formatArtists(track, ' ')), wantedArtist);

		if (score > bestScore) {
			bestScore = score;
			bestTrack = track;
		}
	}

	return bestTrack;
}

export function formatArtists(track: SpotifyTrack, separator = ', '): string {
	return track.artists.map((artist) => artist.name).join(separator);
}
