import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Minus, Plus, SkipBack, SkipForward, Square } from "lucide-react";
import type { Track } from "@/lib/itunes.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type YTPlayer = {
  loadVideoById: (id: string) => void;
  destroy: () => void;
  setVolume?: (volume: number) => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
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

export type PlaybackProgress = { currentMs: number; durationMs: number };

type Props = {
  tracks: Track[];
  index: number;
  onIndexChange: (i: number) => void;
  onStop: () => void;
  onProgress?: (progress: PlaybackProgress) => void;
};

export function PlaylistPlayer({ tracks, index, onIndexChange, onStop, onProgress }: Props) {
  const track = tracks[index];
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubeReadyRef = useRef(false);
  const volumeRef = useRef(100);
  const nextRef = useRef<() => void>(() => undefined);
  const [progress, setProgress] = useState<PlaybackProgress>({ currentMs: 0, durationMs: 0 });
  const [volume, setVolume] = useState(100);
  const [showVideo, setShowVideo] = useState(false);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  nextRef.current = () => {
    if (index + 1 < tracks.length) onIndexChange(index + 1);
    else onIndexChange(0);
  };

  // Report progress up so the playing row can show an elapsed-time bar
  useEffect(() => {
    onProgressRef.current?.(progress);
  }, [progress]);

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
          onReady: (e: { target: YTPlayer }) => {
            youtubeReadyRef.current = true;
            e.target.setVolume?.(volumeRef.current);
          },
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

  // Poll elapsed time from the YouTube player
  useEffect(() => {
    if (!track?.youtubeId) return;
    setProgress({ currentMs: 0, durationMs: 0 });
    const timer = setInterval(() => {
      const p = playerRef.current;
      const getTime = p?.getCurrentTime;
      const getDur = p?.getDuration;
      if (p && typeof getTime === "function" && typeof getDur === "function") {
        setProgress({
          currentMs: Math.max(0, getTime.call(p) * 1000),
          durationMs: Math.max(0, getDur.call(p) * 1000),
        });
      }
    }, 500);
    return () => clearInterval(timer);
  }, [track?.youtubeId]);

  // When switching from YouTube to a preview track, drop the YouTube player
  useEffect(() => {
    if (track?.youtubeId) return;
    playerRef.current?.destroy();
    playerRef.current = null;
    youtubeReadyRef.current = false;
  }, [track?.youtubeId]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      youtubeReadyRef.current = false;
    };
  }, []);

  const changeVolume = (amount: number) => {
    const next = Math.max(0, Math.min(100, volumeRef.current + amount));
    volumeRef.current = next;
    setVolume(next);
    if (audioRef.current) audioRef.current.volume = next / 100;
    if (youtubeReadyRef.current) playerRef.current?.setVolume?.(next);
  };

  // iTunes preview / local MP3 playback
  useEffect(() => {
    if (!track || track.youtubeId) return;
    setProgress({ currentMs: 0, durationMs: track.durationMs });
    if (!track.previewUrl) {
      const t = setTimeout(() => nextRef.current(), 400);
      return () => clearTimeout(t);
    }
    const audio = new Audio(track.previewUrl);
    audio.volume = volumeRef.current / 100;
    audioRef.current = audio;
    const onEnd = () => nextRef.current();
    const onTime = () =>
      setProgress({
        currentMs: audio.currentTime * 1000,
        durationMs: (audio.duration || track.durationMs / 1000) * 1000,
      });
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("timeupdate", onTime);
    void audio.play().catch(() => undefined);
    return () => {
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("timeupdate", onTime);
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
        {track.youtubeId ? (
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label={showVideo ? "Ocultar vídeo" : "Mostrar vídeo"}
            onClick={() => setShowVideo((v) => !v)}
          >
            {showVideo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Volume</span>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Diminuir volume"
          title="Diminuir volume"
          disabled={volume === 0}
          onClick={() => changeVolume(-10)}
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-9 text-center tabular-nums" aria-live="polite">
          {volume}%
        </span>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Aumentar volume"
          title="Aumentar volume"
          disabled={volume === 100}
          onClick={() => changeVolume(10)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-10 shrink-0 tabular-nums">{formatClock(progress.currentMs)}</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-linear"
            style={{
              width: progress.durationMs > 0
                ? `${Math.min(100, (progress.currentMs / progress.durationMs) * 100)}%`
                : "0%",
            }}
          />
        </div>
        <span className="w-10 shrink-0 text-right tabular-nums">
          {progress.durationMs > 0 ? formatClock(progress.durationMs) : "--:--"}
        </span>
      </div>
      {track.youtubeId ? (
        <div
          ref={hostRef}
          className={cn(
            "mt-4 aspect-video w-full overflow-hidden rounded-lg bg-muted [&>iframe]:size-full",
            !showVideo && "hidden",
          )}
        />
      ) : null}
    </div>
  );
}

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
