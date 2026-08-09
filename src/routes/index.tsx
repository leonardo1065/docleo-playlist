import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Sparkles, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackRow } from "@/components/TrackRow";
import { AddToPlaylistDialog } from "@/components/AddToPlaylistDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { searchTracks, type Track } from "@/lib/itunes.functions";
import { usePreviewPlayer } from "@/lib/use-preview-player";

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
  const [selected, setSelected] = useState<Record<string, Track>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const { playingId, toggle } = usePreviewPlayer();

  const search = useServerFn(searchTracks);
  const { data, isFetching, isError } = useQuery({
    queryKey: ["search", query],
    queryFn: () => search({ data: { term: query } }),
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const selectedList = Object.values(selected);

  const toggleSelect = (track: Track) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[track.id]) delete next[track.id];
      else next[track.id] = track;
      return next;
    });

  return (
    <div className="min-h-screen bg-background pb-32">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4">
        <section className="py-14 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Busque, ouça e selecione
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Monte sua <span className="text-primary">Playlist</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
            Digite o nome do cantor ou do grupo, escute uma prévia de cada faixa e escolha as
            músicas que vão entrar na sua playlist.
          </p>

          <form
            className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(term.trim());
            }}
          >
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
            <Button type="submit" size="lg" className="h-12 rounded-full px-6">
              Buscar
            </Button>
          </form>
        </section>

        <section className="pb-10">
          {isFetching ? (
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
            <>
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">
                {data.length} resultados para “{query}”
              </h2>
              <div className="space-y-2">
                {data.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    playing={playingId === track.id}
                    onTogglePlay={() => toggle(track.id, track.previewUrl)}
                    selected={Boolean(selected[track.id])}
                    onToggleSelect={() => toggleSelect(track)}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Comece buscando por um artista para ver as músicas.
            </p>
          )}
        </section>
      </main>

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
        onDone={() => setSelected({})}
      />
    </div>
  );
}
