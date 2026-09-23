const MUSICLINK_LOOKUP_URL = 'https://api.ml.jadquir.com/v1/lookup';

export interface MusicLinkTrack {
	title: string;
	artist: string;
	url?: string;
	links?: {
		spotify?: string;
		anghami?: string;
	};
}

interface MusicLinkResponse {
	success: boolean;
	data?: MusicLinkTrack[];
}

/** Looks up a track url on musiclink. Returns null if musiclink can't find it. */
export async function lookupTrack(trackUrl: string, apiKey: string): Promise<MusicLinkTrack | null> {
	const response = await fetch(`${MUSICLINK_LOOKUP_URL}?q=${encodeURIComponent(trackUrl)}`, {
		headers: { Authorization: `Bearer ${apiKey}` },
	});

	if (response.status === 404) {
		return null;
	}
	if (!response.ok) {
		throw new Error(`Musiclink lookup failed with status ${response.status} :(`);
	}

	const data = (await response.json()) as MusicLinkResponse;
	return data.data?.[0] ?? null;
}
