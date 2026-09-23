# Notas ↔ Obsidian — o que falta para funcionar

Estado em 23/09/2026.

Este documento lista o que precisa ser feito **fora do código** (banco, GitHub,
segredos) e o que ainda precisa ser **escrito**, para a página de Notas
sincronizar com um cofre do Obsidian.

---

## 1. Por que o caminho é o Git

O Obsidian **não tem API nem nuvem que se possa chamar**. Um cofre é uma pasta
de arquivos `.md` no disco, metadados são frontmatter YAML e links são
`[[wikilinks]]`. "Conectar" é escolher um transporte de arquivos.

Quatro transportes foram considerados:

| Caminho | Funciona no celular? | Custo |
|---|---|---|
| **Git (escolhido)** | sim | cofre precisa estar num repositório |
| File System Access API | **não** | zero infra, mas só Chromium no desktop |
| Plugin Local REST API | **não** | só com o Obsidian aberto naquela máquina |
| URI `obsidian://` | parcial | mão única: só abre/cria, não lê |

O critério de desempate foi o celular. O CRM é usado no telefone; um caminho
que só sincroniza quando o Chrome do desktop está aberto nasce capenga
justamente onde mais se usa.

> Sobre o plugin Local REST API, caso alguém queira revisitar: de uma página
> HTTPS na Vercel para `localhost`, esbarra-se em Private Network Access
> (requisição de origem pública para rede local exige preflight específico) e
> num certificado autoassinado. **Não foi testado** — se for tentar, teste
> isso primeiro, é o que decide.

---

## 2. O que já existe no código

- **`src/features/notes/markdown.ts`** — serialização Markdown + frontmatter,
  caminho no cofre e extração de wikilinks. Coberto por 22 asserções.
- **`supabase/migrations/20260923000001_notes.sql`** — tabelas `notes` e
  `notes_sync_config`. **Escrita, ainda não aplicada.**
- **`src/pages/Notes.tsx`** — a tela, ainda como esqueleto (estados vazios).

---

## 3. Passo a passo

### 3.1. Aplicar a migração

Dois caminhos; escolha um.

**Pelo painel do Supabase** — SQL Editor → cole o conteúdo de
`supabase/migrations/20260923000001_notes.sql` → Run.

**Pela CLI**, com o projeto já linkado:

```bash
supabase db push
```

Confira depois que as duas tabelas existem e que o RLS está ligado nas duas.
A migração cria:

- `notes` — as notas
- `notes_sync_config` — repositório, branch e subpasta

### 3.2. Regenerar os tipos do TypeScript

Sem isto o cliente do Supabase não conhece `notes` e o `tsc` acusa erro em
qualquer consulta à tabela nova.

```bash
supabase gen types typescript --project-id <ID_DO_PROJETO> > src/integrations/supabase/types.ts
```

> **Cuidado:** este arquivo já precisou de conserto manual uma vez — a geração
> tinha deixado `\n` literais no meio de declarações, quebrando o parse.
> Depois de regenerar, rode `npx tsc --noEmit -p tsconfig.app.json` e confira
> que a contagem de erros não subiu (a linha de base atual é **29**, todos
> pré-existentes e sem relação com notas).

### 3.3. Preparar o cofre no GitHub

1. Coloque o cofre do Obsidian num repositório (privado).
2. No Obsidian, instale o plugin **Obsidian Git** e configure o
   `pull`/`push` automático. É ele que traz para o seu cofre local o que o
   CRM escrever, e leva para o repositório o que você escrever no Obsidian.
3. Escolha a subpasta onde o CRM vai escrever — o padrão da migração é
   `Porceli/`. Isolar numa subpasta mantém o resto do cofre só seu.

### 3.4. Token do GitHub

Crie um **fine-grained personal access token** com acesso **só a esse
repositório** e permissão **Contents: Read and write**.

> Se usar um token clássico em vez de fine-grained, o escopo necessário é
> `repo` — que dá acesso a **todos** os seus repositórios. Prefira o
> fine-grained.

### 3.5. Guardar o token como segredo da Edge Function

**O token não pode ir para a tabela.** `notes_sync_config` é lida pelo
navegador via RLS; um token ali é um segredo entregue ao cliente.

```bash
supabase secrets set NOTES_GITHUB_TOKEN=github_pat_...
```

### 3.6. Ligar a sincronização

Com as tabelas criadas, inserir a linha de configuração do seu usuário:

```sql
INSERT INTO public.notes_sync_config (user_id, repo, branch, base_path, enabled)
VALUES (auth.uid(), 'seu-usuario/seu-cofre', 'main', 'Porceli', true);
```

(Ou pela tela de Notas, quando a configuração estiver na interface.)

---

## 4. O que ainda precisa ser escrito

Em ordem de dependência:

1. **CRUD das notas** — hook `useNotes` com React Query, no padrão dos outros
   hooks do projeto. Sem isto a tela continua vazia.
2. **Tela de Notas de verdade** — editor, criar/renomear pasta, etiquetas.
3. **Edge Function `notes-sync`** — commita os `.md` no repositório pela API
   do GitHub. É onde o token é usado.
4. **Configuração na interface** — repositório, branch, subpasta, ligar/desligar.
5. **Os quadros** (mapa mental / fluxograma) — ver seção 6.

---

## 5. Decisão em aberto: uma mão ou duas?

O formato aguenta as duas; muda o tamanho da Edge Function.

**Só de ida (CRM → cofre).** Simples, sem conflito: toda escrita do CRM vira
um commit. O que você editar no Obsidian é sobrescrito na próxima gravação
daquela nota.

**Duas mãos.** Precisa de detecção de conflito. O campo `git_sha` existe para
isso: é o SHA do blob na última sincronização, e a API do GitHub exige o SHA
para atualizar um arquivo. SHA divergente **é** a definição de conflito — aí
é preciso decidir a política (o CRM vence, o cofre vence, ou duplica a nota).

Recomendação: **começar só de ida** e subir para duas mãos depois que o uso
real mostrar se você edita mesmo essas notas pelo Obsidian.

---

## 6. Os quadros (mapa mental e fluxograma)

Não viram Markdown. Mas o Obsidian tem o **Canvas**, cujo formato `.canvas` é
JSON aberto com nós e arestas — que é o que o `@xyflow/react` já produz em
`src/features/funnel-maps`.

Não é 1:1: o JSON Canvas tem tipos próprios de nó (`text`, `file`, `link`,
`group`) com `x`/`y`/`width`/`height`, enquanto os nós do funnel-maps são
customizados. Mas é muito mais perto de escrever um exportador do que de
reimplementar um canvas.

---

## 7. Armadilhas conhecidas

**O corpo tem que continuar sendo Markdown.** Se alguém trocar por um editor
rich-text que guarde HTML ou JSON proprietário, a ponte com o Obsidian vira
conversão com perda. A regra está comentada no topo de `markdown.ts`.

**Frontmatter desconhecido tem que sobreviver.** Se você adicionar `aliases:`
ou um campo de Dataview no Obsidian, isso volta em `extra_frontmatter` e é
reescrito no arquivo. Quebrar esse comportamento faz a sincronização apagar em
silêncio o que foi escrito do outro lado — a pior falha possível aqui. Há
teste cobrindo.

**Duas notas não podem gerar o mesmo arquivo.** Há índice único parcial em
`(user_id, vault_path)`. Ao renomear uma nota, o `vault_path` antigo precisa
ser apagado do repositório, senão fica arquivo órfão.

**`folder` é caminho, não FK.** No Obsidian a pasta *é* o caminho do arquivo.
Uma tabela de pastas criaria uma segunda verdade para reconciliar a cada
sincronização.

---

## 8. Como rodar os testes do formato

O projeto não tem runner de teste. O arquivo de asserções é compilado com o
esbuild que já vem no Vite:

```bash
npx esbuild <arquivo-de-teste>.ts --bundle --platform=node --format=cjs --outfile=/tmp/t.cjs && node /tmp/t.cjs
```

Cobre: ida e volta completa, preservação de chaves desconhecidas, arquivo sem
frontmatter, YAML quebrado sem perder o corpo, `tags` como texto, caracteres
proibidos pelo Obsidian no nome do arquivo, acentos e wikilinks com seção.
