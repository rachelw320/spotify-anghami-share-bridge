import { lookupTrack } from './musiclink';
import { formatArtists, searchSpotifyTrack } from './spotify';
import { cleanTrackTitle, parseAnghamiShareText } from './text';

interface Env {
	MUSICLINK_API_KEY: string;
	SPOTIFY_CLIENT_ID: string;
	SPOTIFY_CLIENT_SECRET: string;
}

function errorResponse(status: number, error: string, details: Record<string, unknown> = {}): Response {
	return Response.json({ error, ...details }, { status });
}

/**
 * Spotify -> anghami: GET /?track=SPOTIFY_TRACK_ID
 *
 * Builds the spotify track url and asks musiclink for the matching anghami link.
 */
async function handleSpotifyToAnghami(params: URLSearchParams, env: Env): Promise<Response> {
	const trackId = params.get('track');
	if (!trackId) {
		return errorResponse(400, "No spotify track id sent, can't do much without one :(");
	}

	const spotifyUrl = `https://open.spotify.com/track/${encodeURIComponent(trackId)}`;
	const track = await lookupTrack(spotifyUrl, env.MUSICLINK_API_KEY);
	if (!track) {
		return errorResponse(404, "Couldn't find that spotify track :(");
	}

	// Chop off the tracking bits at the end of the link
	const anghami = track.links?.anghami?.split('?')[0];
	if (!anghami) {
		return errorResponse(404, "Couldn't find this one on anghami :(", { title: track.title, artist: track.artist });
	}

	return Response.json({
		title: track.title,
		artist: track.artist,
		anghami,
		musiclink: track.url ?? null,
	});
}

/**
 * Anghami -> spotify: GET /anghami-to-spotify?share=... or ?title=...&artist=...
 *
 * Musiclink doesn't cope well with anghami links, so this gets the title and artist
 * out of the share text and searches spotify directly instead
 */
async function handleAnghamiToSpotify(params: URLSearchParams, env: Env): Promise<Response> {
	const share = params.get('share');
	let title = params.get('title');
	let artist = params.get('artist');

	if ((!title || !artist) && share) {
		const parsed = parseAnghamiShareText(share);
		if (parsed) {
			({ title, artist } = parsed);
		}
	}

	if (!title || !artist) {
		return errorResponse(400, "Couldn't get the title and artist out of that share text :(", { receivedShare: share });
	}

	const track = await searchSpotifyTrack(
		{ title, artist },
		{ clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET },
	);
	if (!track) {
		return errorResponse(404, "Couldn't find a match on spotify :(", { title, artist });
	}

	return Response.json({
		title: cleanTrackTitle(track.name),
		artist: formatArtists(track),
		spotify: track.external_urls.spotify,
	});
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		try {
			if (url.pathname === '/anghami-to-spotify') {
				return await handleAnghamiToSpotify(url.searchParams, env);
			}
			return await handleSpotifyToAnghami(url.searchParams, env);
		} catch (error) {
			return errorResponse(500, error instanceof Error ? error.message : 'Something went wrong, not sure what :(');
		}
	},
} satisfies ExportedHandler<Env>;
