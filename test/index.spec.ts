import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { chooseBestMatch, type SpotifyTrack } from '../src/spotify';
import { cleanTrackTitle, normalise, parseAnghamiShareText } from '../src/text';

function track(name: string, ...artists: string[]): SpotifyTrack {
	return {
		name,
		artists: artists.map((artistName) => ({ name: artistName })),
		external_urls: { spotify: `https://open.spotify.com/track/${encodeURIComponent(name)}` },
	};
}

describe('parseAnghamiShareText', () => {
	it('extracts title and artist from curly-quoted share text', () => {
		const share = 'Listen to “Howa Enta Meen” by Angham on Anghami https://open.anghami.com/abc';
		expect(parseAnghamiShareText(share)).toEqual({ title: 'Howa Enta Meen', artist: 'Angham' });
	});

	it('accepts straight quotes', () => {
		expect(parseAnghamiShareText('Listen to "Song" by Some Artist on Anghami')).toEqual({ title: 'Song', artist: 'Some Artist' });
	});

	it('returns null for unrecognised text', () => {
		expect(parseAnghamiShareText('https://open.anghami.com/abc')).toBeNull();
	});
});

describe('normalise', () => {
	it('strips accents, punctuation and case', () => {
		expect(normalise('  Beyoncé - Halo (Remix)! ')).toBe('beyonce halo remix');
	});

	it('keeps non-Latin letters', () => {
		expect(normalise('هوا انت مين')).toBe('هوا انت مين');
	});
});

describe('cleanTrackTitle', () => {
	it('replaces ellipses with a single space', () => {
		expect(cleanTrackTitle('Wait... For Me')).toBe('Wait For Me');
		expect(cleanTrackTitle('Wait…For Me')).toBe('Wait For Me');
	});
});

describe('chooseBestMatch', () => {
	it('returns null when there are no results', () => {
		expect(chooseBestMatch([], { title: 'a', artist: 'b' })).toBeNull();
	});

	it('prefers an exact title and artist match over earlier partial matches', () => {
		const tracks = [track('Halo - Live', 'Beyoncé'), track('Halo', 'Someone Else'), track('Halo', 'Beyoncé')];
		expect(chooseBestMatch(tracks, { title: 'Halo', artist: 'Beyonce' })).toBe(tracks[2]);
	});

	it('keeps Spotify order on ties', () => {
		const tracks = [track('Unrelated', 'Nobody'), track('Also Unrelated', 'Nobody')];
		expect(chooseBestMatch(tracks, { title: 'Halo', artist: 'Beyonce' })).toBe(tracks[0]);
	});
});

describe('request validation', () => {
	it('returns 400 when the Spotify track ID is missing', async () => {
		const response = await SELF.fetch('https://example.com/');
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "No spotify track id sent, can't do much without one :(" });
	});

	it('returns 400 when the Anghami share text cannot be parsed', async () => {
		const response = await SELF.fetch('https://example.com/anghami-to-spotify?share=hello');
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Couldn't get the title and artist out of that share text :(", receivedShare: 'hello' });
	});
});
