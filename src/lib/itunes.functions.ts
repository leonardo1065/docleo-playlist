import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Track } from "./itunes";

export type { Track };

const inputSchema = z.object({ term: z.string() });


export const searchTracks = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<Track[]> => {
    const term = data.term.trim();
    if (!term) return [];

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      term,
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
        durationMs: typeof r["trackTimeMillis"] === "number" ? r["trackTimeMillis"] : 0,
      }));
  });
