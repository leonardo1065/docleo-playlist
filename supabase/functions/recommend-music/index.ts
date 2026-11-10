const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Suggestion = { query: string; reason: string };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function readText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  try {
    const payload: unknown = await request.json();
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return jsonResponse({ error: "Dados inválidos." }, 400);
    }
    const body = payload as Record<string, unknown>;
    const artists = readText(body["artists"], 300);
    const favoriteSongs = readText(body["favoriteSongs"], 500);
    const mood = readText(body["mood"], 160);

    if (!artists && !favoriteSongs && !mood) {
      return jsonResponse({ error: "Informe pelo menos uma preferência musical." }, 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY não está configurada para a função recommend-music.");
      return jsonResponse({ error: "O serviço de recomendações não está configurado." }, 500);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "Você é um curador musical. Sugira exatamente 3 músicas.",
              "Considere o gosto e o clima informados.",
              "Responda em português e somente com JSON válido neste formato:",
              '{"suggestions":[{"query":"Artista - Nome da música","reason":"motivo curto"}]}.',
              "Use músicas reais e conhecidas, varie artistas e não repita as favoritas informadas.",
              "As sugestões serão verificadas em um catálogo; não invente metadados.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({ artists, favoriteSongs, mood }),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Falha no Lovable AI Gateway:", response.status);
      if (response.status === 429) {
        return jsonResponse(
          { error: "O serviço está ocupado. Tente novamente em instantes." },
          429,
        );
      }
      if (response.status === 402) {
        return jsonResponse({ error: "Os créditos de IA do projeto acabaram." }, 402);
      }
      return jsonResponse({ error: "Não foi possível gerar sugestões agora." }, 502);
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = result.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return jsonResponse({ error: "O serviço retornou sugestões inválidas." }, 502);
    }

    const parsed = JSON.parse(content) as { suggestions?: unknown };
    const seen = new Set<string>();
    const suggestions: Suggestion[] = (Array.isArray(parsed.suggestions) ? parsed.suggestions : [])
      .map((item): Suggestion | null => {
        if (typeof item !== "object" || item === null) return null;
        const value = item as Record<string, unknown>;
        const query = readText(value["query"], 160);
        const reason = readText(value["reason"], 180);
        const key = query.toLowerCase();
        if (!query || seen.has(key)) return null;
        seen.add(key);
        return { query, reason };
      })
      .filter((item): item is Suggestion => item !== null)
      .slice(0, 3);

    if (!suggestions.length) {
      return jsonResponse(
        { error: "Não encontramos sugestões desta vez. Tente outras preferências." },
        502,
      );
    }

    return jsonResponse({ suggestions });
  } catch (error) {
    console.error("Erro ao gerar recomendações musicais:", error);
    return jsonResponse({ error: "Não foi possível gerar sugestões agora." }, 500);
  }
});
