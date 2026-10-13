import { useEffect, useRef, useState } from "react";

let sharedAudio: HTMLAudioElement | null = null;

export type PlaybackProgress = { currentMs: number; durationMs: number };

export function usePreviewPlayer() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<PlaybackProgress | null>(null);
  const currentId = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      sharedAudio?.pause();
    };
  }, []);

  const toggle = (id: string, url: string | null) => {
    if (!sharedAudio) {
      sharedAudio = new Audio();
      sharedAudio.addEventListener("ended", () => {
        currentId.current = null;
        setPlayingId(null);
        setProgress(null);
      });
      sharedAudio.addEventListener("timeupdate", () => {
        setProgress({
          currentMs: sharedAudio.currentTime * 1000,
          durationMs: (sharedAudio.duration || 0) * 1000,
        });
      });
    }
    if (currentId.current === id) {
      sharedAudio.pause();
      currentId.current = null;
      setPlayingId(null);
      setProgress(null);
      return;
    }
    sharedAudio.pause();
    setProgress(null);
    if (url) {
      sharedAudio.src = url;
      void sharedAudio.play().catch(() => undefined);
    }
    currentId.current = id;
    setPlayingId(id);
  };

  return { playingId, toggle, progress };
}
