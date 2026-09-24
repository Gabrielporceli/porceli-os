-- Quadros das Notas: mapa mental e fluxograma.
--
-- Tabela separada de `notes`, e nao uma coluna nela, por dois motivos:
--   1. `notes` e espelhada em Markdown no cofre do Obsidian. Um quadro nao
--      vira Markdown, entao enfiar o JSON la dentro sujaria cada arquivo .md
--      com um blob que o Obsidian nao sabe renderizar.
--   2. O Obsidian tem formato proprio pra isso (JSON Canvas, arquivos
--      `.canvas`). Guardando separado, exportar pra la depois e so um
--      tradutor de `nodes`/`edges` (ver docs/NOTAS.md).
--
-- `nodes` e `edges` sao JSONB e nao tabelas normalizadas de proposito: o
-- canvas grava o grafo inteiro a cada mudanca, e uma tabela por no
-- transformaria um arrastar de card em dezenas de UPDATEs.

CREATE TABLE IF NOT EXISTS public.note_boards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Sem título',
  -- 'mapa'  = mapa mental (ideias ramificando de um centro)
  -- 'fluxo' = fluxograma (etapas, decisoes, inicio/fim)
  kind        text NOT NULL DEFAULT 'mapa' CHECK (kind IN ('mapa', 'fluxo')),
  folder      text NOT NULL DEFAULT '',
  nodes       jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.note_boards ENABLE ROW LEVEL SECURITY;

-- Mesmo padrao das outras tabelas do sistema: o dono ve e mexe no que e dele.
DROP POLICY IF EXISTS "Users can manage own note_boards" ON public.note_boards;
CREATE POLICY "Users can manage own note_boards"
  ON public.note_boards FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_note_boards_user_kind
  ON public.note_boards (user_id, kind, updated_at DESC);
