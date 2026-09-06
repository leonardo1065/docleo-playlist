import { useEffect, useRef, useState } from "react";

let sharedAudio: HTMLAudioElement | null = null;

export function usePreviewPlayer() {
  const [playingId, setPlayingId] = useState<string | null>(null);
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
      });
    }
    if (currentId.current === id) {
      sharedAudio.pause();
      currentId.current = null;
      setPlayingId(null);
      return;
    }
    sharedAudio.pause();
    if (url) {
      sharedAudio.src = url;
      void sharedAudio.play().catch(() => undefined);
    }
    currentId.current = id;
    setPlayingId(id);
  };

  return { playingId, toggle };
}
