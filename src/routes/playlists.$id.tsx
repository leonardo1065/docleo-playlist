import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, Play, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackRow } from "@/components/TrackRow";
import { PlaylistPlayer } from "@/components/PlaylistPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlaylists, formatDuration } from "@/lib/playlists";

export const Route = createFileRoute("/playlists/$id")({
  validateSearch: (search: Record<string, unknown>): { add?: string } =>
    typeof search["add"] === "string" ? { add: search["add"] } : {},
  head: () => ({
    meta: [
      { title: "Playlist — Monte sua Playlist" },
      {
        name: "description",
        content: "Ouça as prévias, remova faixas e organize as músicas desta playlist.",
      },
      { property: "og:title", content: "Sua playlist" },
      {
        property: "og:description",
        content: "As músicas que você escolheu, reunidas em uma playlist.",
      },
    ],
  }),
  component: PlaylistDetail,
});

function PlaylistDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { playlists, ready, removeTrack, renamePlaylist, deletePlaylist, uploadLocalFiles } =
    usePlaylists();
  const [queueIndex, setQueueIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ currentMs: number; durationMs: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { add } = Route.useSearch();
  const autoOpened = useRef(false);

  useEffect(() => {
    if (add === "mp3" && ready && !autoOpened.current) {
      autoOpened.current = true;
      fileRef.current?.click();
    }
  }, [add, ready]);

  const playlist = playlists.find((p) => p.id === id);
  const currentTrack =
    queueIndex !== null && playlist ? playlist.tracks[queueIndex] : undefined;

  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Playlist não encontrada</h1>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/playlists">Ver minhas playlists</Link>
          </Button>
        </main>
      </div>
    );
  }

  const total = playlist.tracks.reduce((acc, t) => acc + t.durationMs, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <Link
          to="/playlists"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Minhas playlists
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{playlist.name}</h1>
            {playlist.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{playlist.description}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {playlist.tracks.length} {playlist.tracks.length === 1 ? "música" : "músicas"} ·{" "}
              {formatDuration(total)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (!files.length) return;
                setUploading(true);
                try {
                  const n = await uploadLocalFiles(playlist.id, files);
                  toast.success(`${n} ${n === 1 ? "música adicionada" : "músicas adicionadas"} do PC`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Falha ao enviar arquivo");
                } finally {
                  setUploading(false);
                }
              }}
            />
            <Button
              variant="outline"
              className="rounded-full"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" />
              {uploading ? "Enviando..." : "Adicionar MP3 do PC"}
            </Button>
            {playlist.tracks.length > 0 ? (
              <Button className="rounded-full" onClick={() => setQueueIndex(0)}>
                <Play className="size-4" />
                Tocar tudo
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setName(playlist.name);
                setDescription(playlist.description);
                setEditing(true);
              }}
            >
              <Pencil className="size-4" />
              Renomear
            </Button>
            <Button
              variant="outline"
              className="rounded-full text-destructive hover:text-destructive"
              onClick={() => {
                deletePlaylist(playlist.id);
                toast.success("Playlist excluída");
                void navigate({ to: "/playlists" });
              }}
            >
              <Trash2 className="size-4" />
              Excluir
            </Button>
          </div>
        </div>

        {queueIndex !== null && currentTrack ? (
          <div className="mt-8">
            <PlaylistPlayer
              tracks={playlist.tracks}
              index={queueIndex}
              onIndexChange={setQueueIndex}
              onStop={() => setQueueIndex(null)}
              onProgress={setProgress}
            />
          </div>
        ) : null}

        <div className="mt-8 space-y-2">
          {playlist.tracks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground">Esta playlist está vazia.</p>
              <Button asChild className="mt-6 rounded-full">
                <Link to="/">Buscar músicas</Link>
              </Button>
            </div>
          ) : (
            playlist.tracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                inlinePlayer={false}
                playing={currentTrack?.id === track.id}
                onTogglePlay={() =>
                  setQueueIndex(currentTrack?.id === track.id ? null : i)
                }
                action={
                  <button
                    type="button"
                    aria-label={`Remover ${track.title}`}
                    onClick={() => removeTrack(playlist.id, track.id)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                }
              />
            ))
          )}
        </div>
      </main>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Descrição</Label>
              <Input
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  renamePlaylist(playlist.id, name, description);
                  setEditing(false);
                  toast.success("Playlist atualizada");
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
