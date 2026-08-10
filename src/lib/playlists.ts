import { useCallback, useEffect, useState } from "react";
import type { Track } from "./itunes.functions";

export type Playlist = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  tracks: Track[];
};

const STORAGE_KEY = "monte-sua-playlist:v1";
const EVENT = "monte-sua-playlist:change";

function read(): Playlist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Playlist[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(playlists: Playlist[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  window.dispatchEvent(new Event(EVENT));
}

export function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setPlaylists(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const createPlaylist = useCallback((name: string, description = "", tracks: Track[] = []) => {
    const playlist: Playlist = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || "Nova playlist",
      description: description.trim(),
      createdAt: Date.now(),
      tracks,
    };
    write([playlist, ...read()]);
    return playlist;
  }, []);

  const addTracks = useCallback((playlistId: string, tracks: Track[]) => {
    let addedCount = 0;
    const currentPlaylists = read();
    const next = currentPlaylists.map((p) => {
      if (p.id !== playlistId) return p;
      const existingIds = new Set(p.tracks.map((t) => t.id));
      const fresh = tracks.filter((t) => !existingIds.has(t.id));
      addedCount = fresh.length;
      return { ...p, tracks: [...p.tracks, ...fresh] };
    });
    write(next);
    return added;
  }, []);

  const removeTrack = useCallback((playlistId: string, trackId: string) => {
    write(
      read().map((p) =>
        p.id === playlistId ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) } : p,
      ),
    );
  }, []);

  const renamePlaylist = useCallback((playlistId: string, name: string, description: string) => {
    write(
      read().map((p) =>
        p.id === playlistId
          ? { ...p, name: name.trim() || p.name, description: description.trim() }
          : p,
      ),
    );
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    write(read().filter((p) => p.id !== playlistId));
  }, []);

  return {
    playlists,
    ready,
    createPlaylist,
    addTracks,
    removeTrack,
    renamePlaylist,
    deletePlaylist,
  };
}
