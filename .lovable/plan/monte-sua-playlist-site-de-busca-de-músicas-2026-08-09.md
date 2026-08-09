# Monte sua Playlist — site de busca de músicas

Um site em português para buscar artistas/bandas, ouvir prévias e montar playlists próprias.

## Como funciona

1. **Busca** — o usuário digita o nome do grupo ou cantor. A busca usa a API pública do iTunes e retorna as músicas com capa do álbum, nome da faixa, álbum e duração.
2. **Prévia** — cada resultado tem um botão de play que toca 30 segundos da música direto no navegador.
3. **Selecionar** — o usuário marca as músicas desejadas nos resultados (seleção múltipla com checkbox/estado visual).
4. **Adicionar à playlist** — botão "Adicionar à playlist" abre um seletor: escolher uma playlist existente ou criar uma nova na hora (com nome e descrição).
5. **Minhas playlists** — página com todas as playlists criadas: capa em mosaico das 4 primeiras capas, contagem de faixas e duração total. Dentro da playlist é possível ouvir prévias, remover faixas, renomear e excluir a playlist.

As playlists ficam salvas no navegador do usuário (sem login), então continuam disponíveis ao voltar ao site no mesmo dispositivo.

## Páginas

- `/` — home com logo, título "Monte sua Playlist", campo de busca em destaque e os resultados aparecendo logo abaixo.
- `/playlists` — lista de playlists criadas.
- `/playlists/$id` — detalhe de uma playlist.

## Visual

- Paleta clara minimalista: fundo #fafbfc, superfícies #e8ecf1, texto/apoio #94a3b8, destaque azul #3b82f6.
- Logo próprio: marca gráfica simples (onda sonora formando uma lista/pilha) gerada como imagem, usada no cabeçalho e como favicon.
- Tipografia moderna sem serifa, cantos arredondados, muito espaço em branco, cartões leves com sombra suave, transições discretas ao passar o mouse.
- Layout responsivo (bom no celular), cabeçalho fixo com logo + link "Minhas playlists".
- Estados cuidados: campo vazio, "nenhum resultado", carregando (skeletons) e erro de rede.

## Detalhes técnicos

- Busca via `https://itunes.apple.com/search?term=...&entity=song&limit=50` chamada por uma server function do TanStack Start (evita problemas de CORS/limite) e consumida com TanStack Query.
- Estado das playlists em `localStorage` através de um hook `usePlaylists` (criar, renomear, excluir, adicionar/remover faixas, sem duplicar a mesma faixa).
- Prévia de áudio com um player único compartilhado (tocar uma pausa a anterior).
- Tokens de cor/tipografia definidos em `src/styles.css`; componentes shadcn existentes reutilizados.
- `head()` com título e descrição próprios em cada rota.
