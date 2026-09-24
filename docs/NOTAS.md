# Notas — como funciona

Estado em 24/09/2026. Substitui o antigo `NOTAS-OBSIDIAN.md`, que descrevia uma ponte
de duas mãos com o Obsidian que não existe mais.

---

## 1. Quem manda

**O CRM é o dono das notas.** O repositório do cofre é **cópia de segurança de
ida**: o CRM escreve nele, ele nunca escreve de volta.

```
CRM  ──(notes-sync)──►  repositório Git  ──(pull)──►  pasta local do Obsidian
         escreve                              espelho só de leitura
```

O plugin Obsidian Git ficou com `autoSaveInterval: 0` — ele só puxa. A pasta
local continua sendo um jeito de ler as notas fora do sistema, mas o que você
escrever lá **não volta** e será sobrescrito na próxima gravação daquela nota.

### Por que o Obsidian saiu

Enquanto os dois lados eram donos, cada peça que só faz sentido no Obsidian
vazava para a tela do CRM: notas índice que só listam links, seções
"Relacionado" repetindo links que já aparecem no texto, caminho de arquivo,
selo de "pendente", conflito. O módulo existe para *substituir* o Obsidian,
não para conviver com ele.

**O que se perdeu:** escrever pelo app do Obsidian no celular, a visão de
grafo, e o Dataview. Este último era real — a pauta de conteúdo dependia dele
— e virou tabela de verdade (seção 4).

---

## 2. O formato continua Markdown

Não por lealdade ao Obsidian: porque é bom formato. Texto legível, comparável
por diff, sem prisão a fornecedor, e evita uma migração com perda das ~94
notas existentes.

**Mas o Markdown nunca aparece na tela.** O editor (Tiptap) mostra o texto
formatado; o Markdown é só o que fica gravado.

### O portão que protege isso

`/dev/roundtrip` roda TODAS as notas reais pelo editor e de volta, e mede:

| o que mede | por quê |
|---|---|
| escapes novos | o serializador escapa `[`, `~`, `#` e suja o texto |
| palavras perdidas | conteúdo sumindo de verdade |
| estabilidade na 2ª gravação | defeito que **piora** a cada salvamento |

**Mexeu no editor, rode o portão.** Ele já pegou cinco defeitos que passariam
batido, incluindo um que apagava links dentro de tabela e outro que corroía
citações a cada gravação.

Os dados vêm de `public/_roundtrip.json`, gerado do cofre e **fora do git** —
é o seu conteúdo, e aquele repositório é de código.

---

## 3. As peças

| arquivo | o que faz |
|---|---|
| `features/notes/editor/extensoes.ts` | a lista de extensões do editor, usada pelo produto **e** pelo portão |
| `features/notes/editor/Wikilink.ts` | `[[Nota]]` como elemento, não texto |
| `features/notes/editor/QuebraLeve.ts` | quebra de linha que não desfaz citação |
| `features/notes/markdown.ts` | frontmatter, caminho no cofre, extração de links |
| `features/notes/filtro.ts` | o filtro do mural, compartilhado com o laboratório |
| `supabase/functions/notes-sync` | CRM → repositório |
| `supabase/functions/notes-import` | repositório → CRM (só recuperação) |

---

## 4. A pauta

`content_ideas` — os ganchos que vão virar post. Vivia dentro da nota
`Ideias de Conteúdo`, com os campos em sintaxe do Dataview. Virou tabela:
filtro por categoria e formato, marcar feito, editar na célula.

---

## 5. Armadilhas conhecidas

**O corpo tem que continuar sendo Markdown.** Trocar por HTML ou JSON
proprietário transforma qualquer exportação futura em conversão com perda.

**Frontmatter desconhecido tem que sobreviver.** Campos que você acrescentar
voltam em `extra_frontmatter` e são reescritos no arquivo. Quebrar isso faz a
gravação apagar em silêncio o que foi escrito do outro lado.

**Duas notas não podem gerar o mesmo arquivo.** Há índice único parcial em
`(user_id, vault_path)`.

**`folder` é caminho, não FK.** Uma tabela de pastas criaria uma segunda
verdade para reconciliar.

**O `tsc` da raiz mente.** `tsconfig.json` tem `"files": []`, então
`tsc --noEmit` devolve 0 erros sempre. O comando que vale:

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Linha de base em 24/09/2026: **15 erros**, todos anteriores às notas.
