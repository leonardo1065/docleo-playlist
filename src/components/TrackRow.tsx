import { Pause, Play, Music2 } from "lucide-react";
import type { Track } from "@/lib/itunes.functions";
import { formatDuration } from "@/lib/playlists";
import { cn } from "@/lib/utils";

type Props = {
  track: Track;
  playing: boolean;
  onTogglePlay: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  action?: React.ReactNode;
  inlinePlayer?: boolean;
};

export function TrackRow({
  track,
  playing,
  onTogglePlay,
  selected,
  onToggleSelect,
  action,
  inlinePlayer = true,
}: Props) {
  const selectable = typeof onToggleSelect === "function";
  const playable = Boolean(track.previewUrl || track.youtubeId);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card transition-all",
        selectable && "cursor-pointer hover:border-primary/40 hover:shadow-sm",
        selected && "border-primary bg-primary/5",
      )}
      onClick={selectable ? onToggleSelect : undefined}
    >
    <div
      className={cn(
        "group flex items-center gap-3 p-3",
      )}
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {track.artwork ? (
          <img
            src={track.artwork}
            alt={`Capa de ${track.album || track.title}`}
            loading="lazy"
            width={112}
            height={112}
            className="size-full object-cover"
          />
        ) : (
          <Music2 className="absolute inset-0 m-auto size-5 text-muted-foreground" />
        )}
        {playable ? (
          <button
            type="button"
            aria-label={playing ? "Parar" : track.youtubeId ? "Tocar no YouTube" : "Ouvir prévia"}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-foreground/50 text-background opacity-0 transition-opacity group-hover:opacity-100",
              playing && "opacity-100",
            )}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
        <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
        {track.album ? (
          <p className="truncate text-xs text-muted-foreground/80">{track.album}</p>
        ) : track.youtubeId ? (
          <p className="truncate text-xs text-muted-foreground/80">YouTube · música completa</p>
        ) : null}
      </div>

      <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
        {formatDuration(track.durationMs)}
      </span>

      {action}

      {selectable ? (
        <span
          aria-hidden
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md border border-border transition-colors",
            selected && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {selected ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
              <path d="M8 13.2 4.8 10l-1.2 1.2L8 15.6l8.4-8.4-1.2-1.2z" />
            </svg>
          ) : null}
        </span>
      ) : null}
    </div>
      {inlinePlayer && playing && track.youtubeId ? (
        <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
          <iframe
            title={`Player: ${track.title}`}
            src={`https://www.youtube-nocookie.com/embed/${track.youtubeId}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full rounded-lg border-0"
          />
        </div>
      ) : null}
    </div>
  );
}
