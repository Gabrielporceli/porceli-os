-- Pauta de conteudo: o banco de ganchos que vivia dentro de uma nota.
--
-- Estava como lista de tarefas em `Ideias de Conteudo`, com os campos em
-- sintaxe do Dataview (`[cat:: X]`) e uma consulta que montava a tabela. O
-- Dataview e plugin do Obsidian; sem ele aquilo vira bloco de codigo morto.
-- E, no fundo, 36 ganchos com categoria, formato, referencia e feito/nao
-- feito sao uma TABELA — nao um texto.

CREATE TABLE IF NOT EXISTS public.content_ideas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gancho      text NOT NULL DEFAULT '',
  categoria   text NOT NULL DEFAULT '',
  formato     text NOT NULL DEFAULT '',
  -- Link do post que inspirou. Texto livre: sao urls de TikTok e Instagram.
  referencia  text NOT NULL DEFAULT '',
  observacao  text NOT NULL DEFAULT '',
  feito       boolean NOT NULL DEFAULT false,
  -- Ordem manual. Inteiro com espaco entre os valores para reordenar sem
  -- reescrever a tabela inteira.
  ordem       integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own content_ideas" ON public.content_ideas;
CREATE POLICY "Users can manage own content_ideas"
  ON public.content_ideas FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_content_ideas_user_ordem
  ON public.content_ideas (user_id, feito, ordem);
