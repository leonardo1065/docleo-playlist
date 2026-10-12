import { useEffect, useRef } from "react";
import { SkipBack, SkipForward, Square } from "lucide-react";
import type { Track } from "@/lib/itunes.functions";
import { Button } from "@/components/ui/button";

type YTPlayer = {
  loadVideoById: (id: string) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer; PlayerState: { ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytReady: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (ytReady) return ytReady;
  ytReady = new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytReady;
}

type Props = {
  tracks: Track[];
  index: number;
  onIndexChange: (i: number) => void;
  onStop: () => void;
};

export function PlaylistPlayer({ tracks, index, onIndexChange, onStop }: Props) {
  const track = tracks[index];
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextRef = useRef<() => void>(() => undefined);

  nextRef.current = () => {
    if (index + 1 < tracks.length) onIndexChange(index + 1);
    else onIndexChange(0);
  };

  // YouTube playback
  useEffect(() => {
    if (!track?.youtubeId) return;
    let cancelled = false;
    const videoId = track.youtubeId;
    void loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return;
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        return;
      }
      const el = document.createElement("div");
      hostRef.current.replaceChildren(el);
      playerRef.current = new window.YT.Player(el, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === window.YT?.PlayerState.ENDED) nextRef.current();
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [track?.youtubeId]);

  // When switching from YouTube to a preview track, drop the YouTube player
  useEffect(() => {
    if (track?.youtubeId) return;
    playerRef.current?.destroy();
    playerRef.current = null;
  }, [track?.youtubeId]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  // iTunes preview playback
  useEffect(() => {
    if (!track || track.youtubeId) return;
    if (!track.previewUrl) {
      const t = setTimeout(() => nextRef.current(), 400);
      return () => clearTimeout(t);
    }
    const audio = new Audio(track.previewUrl);
    audioRef.current = audio;
    const onEnd = () => nextRef.current();
    audio.addEventListener("ended", onEnd);
    void audio.play().catch(() => undefined);
    return () => {
      audio.removeEventListener("ended", onEnd);
      audio.pause();
      audioRef.current = null;
    };
  }, [track]);

  if (!track) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Tocando {index + 1} de {tracks.length}
          </p>
          <p className="truncate font-medium">{track.title}</p>
          <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Anterior"
          disabled={index === 0}
          onClick={() => onIndexChange(index - 1)}
        >
          <SkipBack className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Próxima"
          disabled={index + 1 >= tracks.length}
          onClick={() => onIndexChange(index + 1)}
        >
          <SkipForward className="size-4" />
        </Button>
        <Button variant="outline" size="icon" className="rounded-full" aria-label="Parar" onClick={onStop}>
          <Square className="size-4" />
        </Button>
      </div>
      {track.youtubeId ? (
        <div
          ref={hostRef}
          className="mt-4 aspect-video w-full overflow-hidden rounded-lg bg-muted [&>iframe]:size-full"
        />
      ) : null}
    </div>
  );
}
