import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Music2, Lock, User, Mail } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login, register, email: savedEmail } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      toast.success("Acesso liberado!");
    } else {
      toast.error("Usuário ou senha inválidos. A senha deve ter 6 dígitos.");
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Insira um e-mail válido.");
      return;
    }
    register(email);
    setIsRegistering(false);
    toast.success("E-mail cadastrado! Agora faça login.");
  };

  if (showRecovery) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-forest p-4">
        <Card className="w-full max-w-md border-white/20 bg-white/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Recuperar Acesso</CardTitle>
            <CardDescription>
              Caso esqueceu a senha ou usuário, utilize o e-mail cadastrado abaixo para contato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-primary/10 p-4 text-sm text-primary">
              {savedEmail ? (
                <p>Seu e-mail cadastrado é: <strong>{savedEmail}</strong>. Utilize-o para recuperar sua conta admin.</p>
              ) : (
                <p>Nenhum e-mail de recuperação cadastrado. Cadastre um e-mail no início.</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full" onClick={() => setShowRecovery(false)}>
              Voltar ao Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-forest p-4">
      <Card className="w-full max-w-md border-white/20 bg-white/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Music2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Monte sua Playlist</CardTitle>
          <CardDescription>
            {isRegistering ? "Cadastre seu e-mail para começar" : "Faça login para acessar o sistema"}
          </CardDescription>
        </CardHeader>

        {isRegistering ? (
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Recuperação</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" className="w-full rounded-full">Finalizar Cadastro</Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setIsRegistering(false)}>
                Já tenho cadastro
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="admin"
                    className="pl-10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha (6 dígitos)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="******"
                    maxLength={6}
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setShowRecovery(true)}
              >
                Esqueceu a senha ou usuário?
              </button>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" className="w-full rounded-full">Acessar</Button>
              <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setIsRegistering(true)}>
                Primeiro acesso? Cadastre e-mail
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
