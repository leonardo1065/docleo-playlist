import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Track } from "./itunes.functions";

export type Playlist = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  tracks: Track[];
};

type TrackRow = {
  playlist_id: string;
  track_id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  preview_url: string | null;
  duration_ms: number;
  youtube_id: string | null;
  position: number;
};

export function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function rowToTrack(r: TrackRow): Track {
  return {
    id: r.track_id,
    title: r.title,
    artist: r.artist,
    album: r.album,
    artwork: r.artwork,
    previewUrl: r.preview_url,
    durationMs: r.duration_ms,
    ...(r.youtube_id ? { youtubeId: r.youtube_id } : {}),
  };
}

async function fetchPlaylists(): Promise<Playlist[]> {
  const [{ data: lists, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
    supabase
      .from("playlists")
      .select("id, name, description, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("playlist_tracks")
      .select(
        "playlist_id, track_id, title, artist, album, artwork, preview_url, duration_ms, youtube_id, position",
      )
      .order("position", { ascending: true }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const byList = new Map<string, Track[]>();
  for (const r of rows ?? []) {
    const arr = byList.get(r.playlist_id) ?? [];
    arr.push(rowToTrack(r));
    byList.set(r.playlist_id, arr);
  }
  return (lists ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: new Date(p.created_at).getTime(),
    tracks: byList.get(p.id) ?? [],
  }));
}

export function usePlaylists() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const key = ["playlists", userId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: fetchPlaylists,
    enabled: Boolean(userId),
  });

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["playlists"] }), [qc]);

  const insertTracks = useCallback(
    async (playlistId: string, tracks: Track[], startPosition: number) => {
      if (!userId || tracks.length === 0) return 0;
      const rows = tracks.map((t, i) => ({
        playlist_id: playlistId,
        user_id: userId,
        track_id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        artwork: t.artwork,
        preview_url: t.previewUrl,
        duration_ms: t.durationMs,
        youtube_id: t.youtubeId ?? null,
        position: startPosition + i,
      }));
      const { error } = await supabase
        .from("playlist_tracks")
        .upsert(rows, { onConflict: "playlist_id,track_id", ignoreDuplicates: true });
      if (error) throw error;
      return rows.length;
    },
    [userId],
  );

  const createPlaylist = useCallback(
    async (name: string, description = "", tracks: Track[] = []) => {
      if (!userId) throw new Error("Faça login primeiro");
      const { data, error } = await supabase
        .from("playlists")
        .insert({
          user_id: userId,
          name: name.trim() || "Nova playlist",
          description: description.trim(),
        })
        .select("id, name, description, created_at")
        .single();
      if (error) throw error;
      await insertTracks(data.id, tracks, 0);
      await refresh();
      return { id: data.id, name: data.name };
    },
    [userId, insertTracks, refresh],
  );

  const addTracks = useCallback(
    async (playlistId: string, tracks: Track[]) => {
      const current = query.data?.find((p) => p.id === playlistId);
      const existing = new Set(current?.tracks.map((t) => t.id) ?? []);
      const fresh = tracks.filter((t) => !existing.has(t.id));
      await insertTracks(playlistId, fresh, current?.tracks.length ?? 0);
      await refresh();
      return fresh.length;
    },
    [query.data, insertTracks, refresh],
  );

  const removeTrack = useCallback(
    async (playlistId: string, trackId: string) => {
      const { error } = await supabase
        .from("playlist_tracks")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("track_id", trackId);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const renamePlaylist = useCallback(
    async (playlistId: string, name: string, description: string) => {
      const update: { description: string; name?: string } = {
        description: description.trim(),
      };
      if (name.trim()) update.name = name.trim();
      const { error } = await supabase.from("playlists").update(update).eq("id", playlistId);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      const { error } = await supabase.from("playlists").delete().eq("id", playlistId);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  return {
    playlists: query.data ?? [],
    ready: Boolean(userId) && !query.isPending,
    createPlaylist,
    addTracks,
    removeTrack,
    renamePlaylist,
    deletePlaylist,
  };
}
