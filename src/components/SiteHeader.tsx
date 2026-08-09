import { Link } from "@tanstack/react-router";
import { ListMusic } from "lucide-react";
import logo from "@/assets/logo.png";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Logo Monte sua Playlist" width={36} height={36} className="size-9" />
          <span className="text-base font-semibold tracking-tight">
            Monte sua <span className="text-primary">Playlist</span>
          </span>
        </Link>
        <Link
          to="/playlists"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          activeProps={{ className: "border-primary/50 text-primary" }}
        >
          <ListMusic className="size-4" />
          Minhas playlists
        </Link>
      </div>
    </header>
  );
}
