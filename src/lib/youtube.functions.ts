import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Track } from "./itunes";

const inputSchema = z.object({ term: z.string() });

function isoDurationToMs(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  return ((h * 60 + min) * 60 + s) * 1000;
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export const searchYouTube = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<Track[]> => {
    const term = data.term.trim();
    if (!term) return [];

    const key = process.env["YOUTUBE_API_KEY"];
    if (!key) throw new Error("Chave do YouTube não configurada");

    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10` +
      `&maxResults=25&regionCode=BR&q=${encodeURIComponent(term)}&key=${key}`;

    const sres = await fetch(searchUrl);
    if (!sres.ok) throw new Error(`Falha na busca do YouTube (${sres.status})`);
    const sjson = (await sres.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
        };
      }>;
    };

    const items = (sjson.items ?? []).filter((i) => i.id?.videoId);
    const ids = items.map((i) => i.id!.videoId!).join(",");
    if (!ids) return [];

    const durations = new Map<string, number>();
    const vres = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${key}`,
    );
    if (vres.ok) {
      const vjson = (await vres.json()) as {
        items?: Array<{ id?: string; contentDetails?: { duration?: string } }>;
      };
      for (const v of vjson.items ?? []) {
        if (v.id) durations.set(v.id, isoDurationToMs(v.contentDetails?.duration ?? ""));
      }
    }

    return items.map((i) => {
      const videoId = i.id!.videoId!;
      return {
        id: `yt-${videoId}`,
        title: decodeEntities(i.snippet?.title ?? "Sem título"),
        artist: decodeEntities(i.snippet?.channelTitle ?? "YouTube"),
        album: "",
        artwork: i.snippet?.thumbnails?.high?.url ?? i.snippet?.thumbnails?.medium?.url ?? "",
        previewUrl: null,
        durationMs: durations.get(videoId) ?? 0,
        youtubeId: videoId,
      };
    });
  });
