import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackRow } from "@/components/TrackRow";
import { AddToPlaylistDialog } from "@/components/AddToPlaylistDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { searchTracksClient, type Track } from "@/lib/itunes";
import { searchYouTube } from "@/lib/youtube.functions";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "@/lib/utils";
import { usePreviewPlayer } from "@/lib/use-preview-player";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SuggestedSearch = { query: string; reason: string };
type RecommendationGroup = SuggestedSearch & { tracks: Track[] };
type LocalMp3Result = { track: Track; file: File };

async function createLocalMp3Result(file: File): Promise<LocalMp3Result> {
  const previewUrl = URL.createObjectURL(file);
  const durationMs = await new Promise<number>((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
    audio.onerror = () => resolve(0);
    audio.src = previewUrl;
  });
  const base = file.name.replace(/\.[^.]+$/, "");
  const separator = base.indexOf(" - ");
  const artist = separator >= 0 ? base.slice(0, separator) : "Meu computador";
  const title = separator >= 0 ? base.slice(separator + 3) : base;

  return {
    file,
    track: {
      id: `local-${crypto.randomUUID()}`,
      title: title.trim() || base,
      artist: artist.trim(),
      album: "Arquivo do PC",
      artwork: "",
      previewUrl,
      durationMs,
    },
  };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monte sua Playlist — busque músicas e crie playlists" },
      {
        name: "description",
        content:
          "Busque por cantor ou banda, ouça prévias e selecione músicas para montar suas próprias playlists.",
      },
      { property: "og:title", content: "Monte sua Playlist" },
      {
        property: "og:description",
        content: "Busque por artista, ouça prévias e monte playlists do seu jeito.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"itunes" | "youtube" | "pc">("youtube");
  const [localResults, setLocalResults] = useState<LocalMp3Result[]>([]);
  const localFileRef = useRef<HTMLInputElement>(null);
  const runYouTube = useServerFn(searchYouTube);
  const [selected, setSelected] = useState<Record<string, Track>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recommendDialogOpen, setRecommendDialogOpen] = useState(false);
  const [recommendationBusy, setRecommendationBusy] = useState(false);
  const [recommendationGroups, setRecommendationGroups] =
    useState<RecommendationGroup[] | null>(null);
  const [favoriteArtists, setFavoriteArtists] = useState("");
  const [favoriteSongs, setFavoriteSongs] = useState("");
  const [desiredMood, setDesiredMood] = useState("");
  const { playingId, toggle, progress } = usePreviewPlayer();
  const hasRecommendationInput = Boolean(
    favoriteArtists.trim() || favoriteSongs.trim() || desiredMood.trim(),
  );

  const { data, isFetching, isError } = useQuery({
    queryKey: ["search", source, query],
    queryFn: () =>
      source === "youtube" ? runYouTube({ data: { term: query } }) : searchTracksClient(query),
    enabled: source !== "pc" && query.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(
    () => () => {
      localResults.forEach(({ track }) => {
        if (track.previewUrl) URL.revokeObjectURL(track.previewUrl);
      });
    },
    [localResults],
  );

  const selectedList = Object.values(selected);
  const selectedLocalFiles = localResults
    .filter(({ track }) => Boolean(selected[track.id]))
    .map(({ file }) => file);

  const toggleSelect = (track: Track) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[track.id]) delete next[track.id];
      else next[track.id] = track;
      return next;
    });

  const generateRecommendations = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (recommendationBusy || !hasRecommendationInput) return;
    setRecommendationBusy(true);
    setRecommendationGroups(null);
    try {
      const { data: generated, error } = await supabase.functions.invoke<{
        suggestions: SuggestedSearch[];
      }>("recommend-music", {
        body: {
          artists: favoriteArtists,
          favoriteSongs,
          mood: desiredMood,
        },
      });
      if (error) {
        const context = "context" in error ? error.context : null;
        if (context instanceof Response) {
          const errorBody = (await context.clone().json().catch(() => null)) as
            | { error?: unknown }
            | null;
          if (typeof errorBody?.error === "string") throw new Error(errorBody.error);
        }
        throw new Error("Não foi possível gerar sugestões agora. Tente novamente.");
      }

      const suggestions = generated?.suggestions ?? [];
      const searched = await Promise.all(
        suggestions.map(async (suggestion) => {
          const tracks =
            source === "youtube"
              ? await runYouTube({ data: { term: suggestion.query } })
              : await searchTracksClient(suggestion.query);
          return { ...suggestion, tracks };
        }),
      );

      const seenTrackIds = new Set<string>();
      const groups = searched
        .map((group) => ({
          ...group,
          tracks: group.tracks
            .filter((track) => {
              if (seenTrackIds.has(track.id)) return false;
              seenTrackIds.add(track.id);
              return true;
            })
            .slice(0, 2),
        }))
        .filter((group) => group.tracks.length > 0);

      setRecommendationGroups(groups);
      setTerm("");
      setQuery("");
      setRecommendDialogOpen(false);
      if (groups.length === 0) {
        toast.info("Não encontramos essas sugestões no catálogo. Tente outras preferências.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível gerar sugestões agora.",
      );
    } finally {
      setRecommendationBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-forest pb-32">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4">
        <section className="py-14 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
            <Sparkles className="size-3.5 text-primary" />
            Monte sua trilha sonora na natureza
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-6xl">
            Monte sua <span className="text-primary-foreground underline decoration-primary underline-offset-8">Playlist</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-white/90 drop-shadow-md">
            Busque seus artistas favoritos e selecione as melhores músicas para sua nova playlist, 
            tudo em um ambiente tranquilo e inspirador.
          </p>


          <form
            className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (source === "pc") {
                localFileRef.current?.click();
                return;
              }
              setRecommendationGroups(null);
              setQuery(term.trim());
            }}
          >
            {source === "pc" ? (
              <div className="flex h-12 flex-1 items-center gap-3 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground shadow-sm">
                <Upload className="size-4 shrink-0" />
                Escolha arquivos MP3 do seu computador
              </div>
            ) : (
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Ex.: Legião Urbana, Adele, Racionais..."
                  aria-label="Buscar artista ou banda"
                  className="h-12 rounded-full border-border bg-card pl-10 text-base shadow-sm"
                />
              </div>
            )}
            <input
              ref={localFileRef}
              type="file"
              accept=".mp3,audio/mpeg"
              multiple
              className="hidden"
              onChange={async (e) => {
                const chosenFiles = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (!chosenFiles.length) return;

                const files = chosenFiles.filter((file) => file.name.toLowerCase().endsWith(".mp3"));
                if (files.length !== chosenFiles.length) {
                  toast.info("A busca no computador aceita somente arquivos MP3.");
                }
                if (files.length === 0) return;

                try {
                  const results = await Promise.all(files.map(createLocalMp3Result));
                  setLocalResults(results);
                  setSelected({});
                } catch {
                  toast.error("Não foi possível abrir os arquivos selecionados.");
                }
              }}
            />
            <Button type="submit" size="lg" className="h-12 rounded-full px-6">
              {source === "pc" ? "Selecionar MP3" : "Buscar"}
            </Button>
          </form>

          <div
            role="radiogroup"
            aria-label="Fonte da busca"
            className="mx-auto mt-4 inline-flex max-w-full flex-wrap justify-center rounded-full border border-white/20 bg-white/10 p-1 backdrop-blur-md"
          >
            {(
              [
                ["youtube", "YouTube (música completa)"],
                ["itunes", "iTunes (prévia 30s)"],
                ["pc", "Meu PC (MP3)"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={source === value}
                onClick={() => {
                  if (source === value) return;
                  setSource(value);
                  setQuery("");
                  setSelected({});
                  setLocalResults([]);
                  setRecommendationGroups(null);
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  source === value
                    ? "bg-primary text-primary-foreground"
                    : "text-white/90 hover:bg-white/10",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              className="mt-5 rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              disabled={source === "pc"}
              onClick={() => setRecommendDialogOpen(true)}
            >
              <Sparkles className="size-4" />
              Sugerir músicas com IA
            </Button>
          </div>
        </section>

        <section className="pb-10">
          {source === "pc" ? (
            localResults.length > 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/70 p-6 backdrop-blur-xl dark:bg-black/70">
                <h2 className="mb-6 text-sm font-semibold text-foreground/80">
                  {localResults.length} {" "}
                  {localResults.length === 1 ? "MP3 encontrado" : "MP3s encontrados"} no computador
                </h2>
                <div className="space-y-3">
                  {localResults.map(({ track }) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      playing={playingId === track.id}
                      onTogglePlay={() => toggle(track.id, track.previewUrl)}
                      progress={playingId === track.id ? progress : undefined}
                      selected={Boolean(selected[track.id])}
                      onToggleSelect={() => toggleSelect(track)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-lg font-medium text-white drop-shadow-md">
                  Selecione arquivos MP3 do computador para começar.
                </p>
              </div>
            )
          ) : recommendationBusy ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-1/2 rounded-xl" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[80px] w-full rounded-xl" />
              ))}
            </div>
          ) : recommendationGroups ? (
            recommendationGroups.length > 0 ? (
              <div className="space-y-6 rounded-3xl border border-white/10 bg-white/70 p-6 backdrop-blur-xl dark:bg-black/70">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Sugestões para você</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Encontramos estas músicas no catálogo. Selecione as que quiser adicionar.
                  </p>
                </div>
                {recommendationGroups.map((group) => (
                  <div key={group.query} className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold">{group.query}</h3>
                      <p className="text-xs text-muted-foreground">{group.reason}</p>
                    </div>
                    {group.tracks.map((track) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        playing={playingId === track.id}
                        onTogglePlay={() => toggle(track.id, track.previewUrl)}
                        progress={playingId === track.id ? progress : undefined}
                        selected={Boolean(selected[track.id])}
                        onToggleSelect={() => toggleSelect(track)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Não encontramos músicas correspondentes no catálogo.
              </p>
            )
          ) : isFetching ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[80px] w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
              Não foi possível buscar agora. Tente novamente em instantes.
            </p>
          ) : query && data && data.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma música encontrada para “{query}”.
            </p>
          ) : data && data.length > 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/70 p-6 backdrop-blur-xl dark:bg-black/70">
              <h2 className="mb-6 text-sm font-semibold text-foreground/80">
                {data.length} resultados encontrados para “{query}”
              </h2>
              <div className="space-y-3">
                {data.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    playing={playingId === track.id}
                    onTogglePlay={() => toggle(track.id, track.previewUrl)}
                    progress={playingId === track.id ? progress : undefined}
                    selected={Boolean(selected[track.id])}
                    onToggleSelect={() => toggleSelect(track)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg font-medium text-white drop-shadow-md">
                Encontre a harmonia perfeita. Comece sua busca acima.
              </p>
            </div>
          )}

        </section>
      </main>

      <Dialog open={recommendDialogOpen} onOpenChange={setRecommendDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Descubra novas músicas</DialogTitle>
            <DialogDescription>
              Conte o que você gosta e qual clima procura. As sugestões serão conferidas no
              catálogo antes de aparecerem.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={generateRecommendations} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="favorite-artists">Artistas favoritos</Label>
              <Textarea
                id="favorite-artists"
                value={favoriteArtists}
                onChange={(e) => setFavoriteArtists(e.target.value)}
                placeholder="Ex.: Marisa Monte, Djavan, Adele"
                maxLength={300}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="favorite-songs">Músicas de que você gosta</Label>
              <Textarea
                id="favorite-songs"
                value={favoriteSongs}
                onChange={(e) => setFavoriteSongs(e.target.value)}
                placeholder="Ex.: O Leãozinho, Ainda Bem"
                maxLength={500}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desired-mood">Clima desejado</Label>
              <Input
                id="desired-mood"
                value={desiredMood}
                onChange={(e) => setDesiredMood(e.target.value)}
                placeholder="Ex.: relaxante para ouvir no fim do dia"
                maxLength={160}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRecommendDialogOpen(false)}
                disabled={recommendationBusy}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!hasRecommendationInput || recommendationBusy}>
                <Sparkles className="size-4" />
                {recommendationBusy ? "Buscando sugestões..." : "Gerar sugestões"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selectedList.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelected({})}
                aria-label="Limpar seleção"
                className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
              <span className="text-sm font-medium">
                {selectedList.length}{" "}
                {selectedList.length === 1 ? "música selecionada" : "músicas selecionadas"}
              </span>
            </div>
            <Button className="rounded-full" onClick={() => setDialogOpen(true)}>
              Adicionar à playlist
            </Button>
          </div>
        </div>
      ) : null}

      <AddToPlaylistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tracks={selectedList}
        localFiles={selectedLocalFiles}
        onDone={() => {
          setSelected({});
          setLocalResults([]);
          setTerm("");
          setQuery("");
        }}
      />
    </div>
  );
}
