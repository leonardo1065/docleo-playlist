export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  previewUrl: string | null;
  durationMs: number;
  youtubeId?: string;
};

export async function searchTracksClient(term: string): Promise<Track[]> {
  const q = term.trim();
  if (!q) return [];

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    q,
  )}&entity=song&limit=50&country=BR`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha na busca de músicas (${res.status})`);
  }

  const json = (await res.json()) as {
    results?: Array<Record<string, unknown>>;
  };

  return (json.results ?? [])
    .filter((r) => typeof r["trackId"] === "number")
    .map((r) => ({
      id: String(r["trackId"]),
      title: String(r["trackName"] ?? "Sem título"),
      artist: String(r["artistName"] ?? "Desconhecido"),
      album: String(r["collectionName"] ?? ""),
      artwork: String(r["artworkUrl100"] ?? "").replace("100x100", "300x300"),
      previewUrl: typeof r["previewUrl"] === "string" ? r["previewUrl"] : null,
      durationMs:
        typeof r["trackTimeMillis"] === "number" ? r["trackTimeMillis"] : 0,
    }));
}
