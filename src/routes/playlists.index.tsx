import { createFileRoute, Link } from "@tanstack/react-router";
import { ListMusic, Music2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { usePlaylists, formatDuration } from "@/lib/playlists";

export const Route = createFileRoute("/playlists/")({
  head: () => ({
    meta: [
      { title: "Minhas playlists — Monte sua Playlist" },
      {
        name: "description",
        content: "Veja, edite e ouça as playlists que você montou com suas músicas favoritas.",
      },
      { property: "og:title", content: "Minhas playlists" },
      {
        property: "og:description",
        content: "Todas as playlists que você criou, salvas neste navegador.",
      },
    ],
  }),
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const { playlists, ready } = usePlaylists();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Minhas playlists</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Suas playlists ficam salvas neste navegador.
        </p>

        {!ready ? null : playlists.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <ListMusic className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Você ainda não criou nenhuma playlist.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/">Buscar músicas</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((p) => {
              const total = p.tracks.reduce((acc, t) => acc + t.durationMs, 0);
              const covers = p.tracks.slice(0, 4);
              return (
                <Link
                  key={p.id}
                  to="/playlists/$id"
                  params={{ id: p.id }}
                  className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="grid aspect-square grid-cols-2 grid-rows-2 bg-muted">
                    {covers.length === 0 ? (
                      <Music2 className="col-span-2 row-span-2 m-auto size-8 text-muted-foreground" />
                    ) : (
                      Array.from({ length: 4 }).map((_, i) => {
                        const t = covers[i % covers.length];
                        return (
                          <img
                            key={i}
                            src={t.artwork}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        );
                      })
                    )}
                  </div>
                  <div className="p-4">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.tracks.length} {p.tracks.length === 1 ? "música" : "músicas"} ·{" "}
                      {formatDuration(total)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
