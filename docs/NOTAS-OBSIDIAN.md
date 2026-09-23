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

## 2. O que já está pronto

- **`src/features/notes/markdown.ts`** — serialização Markdown + frontmatter,
  caminho no cofre e extração de wikilinks. Coberto por 22 asserções.
- **`src/features/notes/useNotes.ts`** — CRUD contra o Supabase.
- **`src/pages/Notes.tsx`** — a tela: lista, editor com salvamento automático,
  pastas, etiquetas, busca, wikilinks navegáveis e backlinks.
- **`supabase/functions/notes-sync/`** — publicada e ativa.
- Tabela **`notes`** — criada, com RLS e política.
- Tipos do Supabase — regenerados.

Falta só o **passo 3**: os segredos.

---

## 3. Passo a passo

### 3.1. Preparar o cofre no GitHub

1. Coloque o cofre do Obsidian num repositório (privado).
2. No Obsidian, instale o plugin **Obsidian Git** e configure o
   `pull`/`push` automático. É ele que traz para o seu cofre local o que o
   CRM escrever, e leva para o repositório o que você escrever no Obsidian.
3. Escolha a subpasta onde o CRM vai escrever — o padrão da migração é
   `Porceli/`. Isolar numa subpasta mantém o resto do cofre só seu.

### 3.2. Token do GitHub

Crie um **fine-grained personal access token** com acesso **só a esse
repositório** e permissão **Contents: Read and write**.

> Se usar um token clássico em vez de fine-grained, o escopo necessário é
> `repo` — que dá acesso a **todos** os seus repositórios. Prefira o
> fine-grained.

### 3.3. Configurar a função (tudo por segredo)

Repositório, branch e subpasta são variáveis de ambiente da Edge Function,
junto do token. Não há tabela nem tela de configuração: o sistema tem um
usuário e um cofre, então isso é constante — e o token teria de viver aqui
de qualquer forma, já que uma tabela lida pelo navegador não pode guardá-lo.

```bash
supabase secrets set NOTES_GITHUB_TOKEN=github_pat_...
supabase secrets set NOTES_GITHUB_REPO=usuario/meu-cofre
supabase secrets set NOTES_GITHUB_BRANCH=main      # opcional, padrão main
supabase secrets set NOTES_BASE_PATH=Porceli       # opcional, padrão Porceli
```

Faltando qualquer um dos obrigatórios, a função responde com a mensagem
exata do que falta, e ela aparece no aviso da tela.

### 3.4. Testar

A função já está publicada. Depois dos segredos, abra uma nota e clique em
**Sincronizar** — deve aparecer `<subpasta>/<Título>.md` no repositório, com
o frontmatter no topo.

Se precisar republicar depois de mexer no código dela:

```bash
supabase functions deploy notes-sync
```

---

## 4. O que ainda não foi feito

1. **Os quadros** (mapa mental / fluxograma) — ver seção 6.
2. **Vincular nota a cliente/lead** — as colunas `client_id` e `lead_id`
   existem e viram `porceli.client` / `porceli.lead` no frontmatter, mas nada
   na tela as preenche ainda.
3. **Sincronização de duas mãos** — ver seção 5.

E um aviso: **o CRUD nunca rodou com sessão real**. Criar, editar e excluir
nota dependem de login, então o primeiro uso de verdade é também o primeiro
teste.

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
