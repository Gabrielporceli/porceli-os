-- ─────────────────────────────────────────────────────────────────────────────
-- Notas — armazenamento espelhável em cofre do Obsidian
--
-- O corpo é MARKDOWN PURO, não HTML nem documento de editor. Um cofre do
-- Obsidian é uma pasta de arquivos .md com frontmatter YAML; guardar em
-- qualquer outro formato transformaria a sincronização em conversão com
-- perda. A serialização vive em src/features/notes/markdown.ts.
--
-- `folder` é caminho, não FK para uma tabela de pastas: no Obsidian a pasta
-- É o caminho do arquivo. Uma tabela de pastas criaria uma segunda verdade
-- que teria de ser reconciliada a cada sincronização.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title       TEXT        NOT NULL DEFAULT 'Sem título',
  body        TEXT        NOT NULL DEFAULT '',      -- Markdown
  folder      TEXT        NOT NULL DEFAULT '',      -- '' = raiz do cofre
  tags        TEXT[]      NOT NULL DEFAULT '{}',

  -- Vínculos com o CRM. Viram `porceli.client` / `porceli.lead` no
  -- frontmatter — é o que permite abrir a nota de um cliente dentro do
  -- Obsidian e ainda saber de quem ela é.
  client_id   UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id     UUID        REFERENCES public.leads(id)   ON DELETE SET NULL,

  -- Frontmatter que não é nosso (aliases, cssclasses, campos de Dataview…).
  -- Guardado para devolver intacto ao escrever o arquivo de volta; sem isto
  -- a sincronização apagaria em silêncio o que foi escrito no Obsidian.
  extra_frontmatter JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- ── Estado da sincronização com o cofre ──
  -- Caminho real do arquivo no repositório, ex.: 'Clientes/Acme/Reunião.md'.
  -- Guardado (em vez de recalculado do título) para detectar renomeação e
  -- apagar o arquivo antigo em vez de deixar órfão.
  vault_path  TEXT,
  -- SHA do blob na última sincronização. A API do GitHub exige o sha para
  -- atualizar um arquivo; divergência entre este valor e o do repositório é
  -- exatamente a definição de conflito.
  git_sha     TEXT,
  synced_at   TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes"
  ON public.notes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notes_user_folder
  ON public.notes (user_id, folder);

-- Filtro por etiqueta sem varrer a tabela.
CREATE INDEX IF NOT EXISTS idx_notes_tags
  ON public.notes USING GIN (tags);

-- Duas notas não podem apontar para o mesmo arquivo do cofre: a segunda
-- sobrescreveria a primeira a cada sincronização. Parcial porque
-- vault_path só existe depois da primeira sincronização.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_vault_path_unico
  ON public.notes (user_id, vault_path)
  WHERE vault_path IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- Configuração da ponte com o Git
--
-- O TOKEN NÃO FICA AQUI. Esta tabela é lida pelo navegador via RLS; um token
-- do GitHub nela seria um segredo entregue ao cliente. Ele vive como secret
-- da Edge Function que faz os commits.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notes_sync_config (
  user_id     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  repo        TEXT        NOT NULL,                  -- 'usuario/cofre'
  branch      TEXT        NOT NULL DEFAULT 'main',
  -- Subpasta do repositório onde as notas do CRM entram. Isola o que o CRM
  -- escreve do resto do cofre, que continua sendo só seu.
  base_path   TEXT        NOT NULL DEFAULT 'Porceli',
  enabled     BOOLEAN     NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_error  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes_sync_config"
  ON public.notes_sync_config FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
