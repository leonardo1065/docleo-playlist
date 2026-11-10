import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Music2, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, isAuthenticated, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!ready) {
    return <div className="fixed inset-0 bg-forest" aria-busy="true" />;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (mode === "register" && password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setBusy(true);
    const error =
      mode === "login" ? await login(username, password) : await register(username, password);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(mode === "login" ? "Bem-vindo de volta!" : "Conta criada! Você já está dentro.");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-forest p-4">
      <Card className="w-full max-w-md border-white/20 bg-white/80 shadow-2xl backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Music2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Monte sua Playlist</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Entre com seu usuário e senha"
              : "Crie sua conta — sem confirmação por e-mail"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={submit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="seu.usuario"
                  className="pl-10"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="mínimo 6 caracteres"
                  className="pl-10 pr-10"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-muted-foreground"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {mode === "register" ? (
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    className="pl-10 pr-10"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 text-muted-foreground"
                    onClick={() => setShowConfirm((visible) => !visible)}
                    aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                    title={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full rounded-full" disabled={busy}>
              {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tenho conta"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
