import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Track } from "@/lib/itunes.functions";
import { usePlaylists } from "@/lib/playlists";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracks: Track[];
  onDone: () => void;
};

export function AddToPlaylistDialog({ open, onOpenChange, tracks, onDone }: Props) {
  const { playlists, createPlaylist, addTracks } = usePlaylists();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const finish = (playlistName: string, added: number) => {
    if (added > 0) {
      toast.success(
        `${added} ${added === 1 ? "música adicionada" : "músicas adicionadas"} em "${playlistName}"`,
      );
    } else {
      toast.info(`Essas músicas já estavam em "${playlistName}"`);
    }
    setCreating(false);
    setName("");
    setDescription("");
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar à playlist</DialogTitle>
          <DialogDescription>
            {tracks.length} {tracks.length === 1 ? "música selecionada" : "músicas selecionadas"}
          </DialogDescription>
        </DialogHeader>

        {creating ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pl-name">Nome da playlist</Label>
              <Input
                id="pl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Rock para dirigir"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl-desc">Descrição (opcional)</Label>
              <Input
                id="pl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Uma frase sobre a playlist"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Voltar
              </Button>
              <Button
                disabled={!name.trim()}
                onClick={() => {
                  const pl = createPlaylist(name, description, tracks);
                  finish(pl.name, tracks.length);
                }}
              >
                Criar e adicionar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/50 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Plus className="size-4" />
              </span>
              <span className="text-sm font-medium text-primary">Criar nova playlist</span>
            </button>

            {playlists.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {playlists.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => finish(p.name, addTracks(p.id, tracks))}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {p.tracks.length} {p.tracks.length === 1 ? "música" : "músicas"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você ainda não tem playlists. Crie a primeira acima.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
