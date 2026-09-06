import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const EMAIL_DOMAIN = "montesuaplaylist.local";

export function normalizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

function toEmail(username: string) {
  return `${normalizeUsername(username)}@${EMAIL_DOMAIN}`;
}

function translateError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Usuário ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Esse nome de usuário já está em uso.";
  if (m.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  return "Não foi possível concluir. Tente novamente.";
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setReady(true);
    });
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const user = normalizeUsername(username);
    if (!user) return "Informe o nome de usuário.";
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(user),
      password,
    });
    return error ? translateError(error.message) : null;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const user = normalizeUsername(username);
    if (user.length < 3) return "O usuário precisa ter pelo menos 3 letras ou números.";
    if (password.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
    const { data, error } = await supabase.auth.signUp({
      email: toEmail(user),
      password,
      options: { data: { username: user } },
    });
    if (error) return translateError(error.message);
    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, username: user });
    }
    return null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const username =
    (session?.user.user_metadata as { username?: string } | undefined)?.username ?? null;

  return {
    ready,
    session,
    userId: session?.user.id ?? null,
    isAuthenticated: Boolean(session),
    username,
    login,
    register,
    logout,
  };
}
