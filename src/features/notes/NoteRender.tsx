/**
 * Leitura da nota: o Markdown virado texto formatado.
 *
 * POR QUE NÃO UM EDITOR RICH-TEXT. O corpo TEM de continuar sendo Markdown —
 * é o que o cofre do Obsidian lê. Um editor que edita o texto formatado
 * precisa serializar de volta, e toda serialização perde o que não entende.
 * Medido neste cofre: a nota `Ideias de Conteúdo` tem um bloco `dataview` e
 * campos `[cat:: Tráfego Pago]`, que nenhum editor visual preserva — e ela é
 * justamente o banco de pauta. Então: LER é formatado, ESCREVER é o Markdown
 * cru. A ida pro Obsidian não precisa de conversão nenhuma; já nasce no
 * formato certo.
 *
 * `react-markdown` não renderiza HTML cru sem `rehype-raw`, que não foi
 * instalado de propósito: nota vinda do cofre é texto de fora, e injetar
 * HTML dela na página seria um buraco desnecessário. O cofre tem 0 notas
 * com HTML, então não se perde nada.
 */
import { createContext, useContext, useMemo } from "react";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link21, Gallery } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** Protocolo interno: vira chip clicável no componente `a`. */
const PROTO = "wikilink:";
const ANEXO = "anexo:";

/**
 * Converte a sintaxe do Obsidian para links que o Markdown entende, SEM
 * tocar no que está dentro de código — lá `[[x]]` é literal e mexer nisso
 * estragaria o bloco `dataview`, que é cheio de colchetes.
 */
export function prepararWikilinks(texto: string): string {
  // Divide preservando os delimitadores: cerca ``` e crase simples.
  const partes = texto.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return partes
    .map((parte, i) => {
      if (i % 2 === 1) return parte; // pedaço de código: passa intacto
      return parte
        // ![[arquivo]] — anexo que vive no cofre, não temos o binário aqui
        .replace(/!\[\[([^\]]+)\]\]/g, (_, alvo: string) => {
          const nome = String(alvo).split("|")[0].trim();
          return `[${nome}](${ANEXO}${encodeURIComponent(nome)})`;
        })
        // [[Nota]], [[Nota|texto]], [[Nota#secao]]
        .replace(/\[\[([^\]]+)\]\]/g, (_, interno: string) => {
          const [alvoBruto, alias] = String(interno).split("|");
          const alvo = alvoBruto.split("#")[0].trim();
          const rotulo = (alias ?? alvoBruto).trim();
          return `[${rotulo}](${PROTO}${encodeURIComponent(alvo)})`;
        });
    })
    .join("");
}

/**
 * Marca/desmarca a tarefa da linha indicada, no Markdown cru.
 *
 * INVARIANTE DE QUE ISSO DEPENDE: `prepararWikilinks` faz só substituição
 * dentro da linha, nunca acrescenta nem tira quebra. Então o número de linha
 * que o renderizador informa (que é do texto preparado) é o MESMO do corpo
 * original, e dá pra editar direto ali. Se um dia o preparo passar a mexer em
 * linhas, isto marca a tarefa errada — por isso há teste cobrindo.
 */
export function alternarTarefaNaLinha(body: string, linha: number): string {
  const linhas = body.split("\n");
  const i = linha - 1;
  if (i < 0 || i >= linhas.length) return body;
  // Aceita -, * e + como marcador, e indentação (subtarefa).
  const m = /^(\s*[-*+]\s+\[)([ xX])(\])/.exec(linhas[i]);
  if (!m) return body;
  const marca = m[2] === " " ? "x" : " ";
  linhas[i] = m[1] + marca + linhas[i].slice(m[1].length + 1);
  return linhas.join("\n");
}

/**
 * Carrega a linha do item de lista até o checkbox, que é filho dele. O
 * checkbox do GFM é um nó sintético e não tem posição própria — medido: vem
 * sempre `position: null`. A do `<li>` é real.
 */
const LinhaDaTarefa = createContext<{
  linha: number | null;
  alternar?: (linha: number) => void;
}>({ linha: null });

function CaixaDeTarefa({ checked }: { checked?: boolean }) {
  const { linha, alternar } = useContext(LinhaDaTarefa);
  const clicavel = Boolean(alternar) && linha != null;

  const visual = cn(
    "mr-1.5 inline-flex h-3.5 w-3.5 translate-y-0.5 items-center justify-center rounded border text-[9px] transition-colors",
    checked ? "border-primary bg-primary text-white" : "border-white/25"
  );

  if (!clicavel) {
    return <span className={visual}>{checked ? "✓" : ""}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => alternar!(linha!)}
      title={checked ? "Desmarcar" : "Marcar"}
      aria-pressed={checked}
      className={cn(visual, "cursor-pointer hover:border-primary/70 hover:bg-primary/25")}
    >
      {checked ? "✓" : ""}
    </button>
  );
}

interface Props {
  body: string;
  /** Títulos existentes, pra link quebrado aparecer diferente. */
  existentes: Set<string>;
  onAbrirTitulo: (titulo: string) => void;
  /** Sem isto as caixas aparecem, mas não clicam (ex.: pré-visualização). */
  onAlternarTarefa?: (linha: number) => void;
  className?: string;
}

/**
 * Corta a seção "Relacionado" do fim da nota, só na leitura.
 *
 * Quase toda nota deste cofre termina com "## Relacionado" listando links —
 * e esses mesmos links já aparecem no meio do texto como botões. Na tela era
 * a mesma lista duas vezes. O Markdown NÃO é tocado: o Obsidian continua
 * recebendo a seção, que lá tem função.
 *
 * Corta só do fim pra frente, e por isso as linhas anteriores mantêm o
 * número — que é do que o clique na tarefa depende.
 */
export function semSecaoFinalRelacionado(texto: string): string {
  const linhas = texto.split("\n");
  for (let i = linhas.length - 1; i >= 0; i--) {
    const cabecalho = /^#{1,6}\s+(.+?)\s*$/.exec(linhas[i]);
    if (!cabecalho) continue;
    // Só o ÚLTIMO título do documento conta: se "Relacionado" estiver no meio,
    // tem conteúdo depois dele e cortar levaria junto.
    if (/^relacionad[oa]s?$/i.test(cabecalho[1].replace(/[*_`]/g, "").trim())) {
      // Sobe comendo linha em branco E separador `---`, alternadamente: no
      // padrão deste cofre vem "texto / em branco / --- / em branco / título",
      // então tratar os dois em laços separados deixava o traço pendurado.
      let fim = i;
      while (
        fim > 0 &&
        (linhas[fim - 1].trim() === "" || /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(linhas[fim - 1]))
      ) fim--;
      return linhas.slice(0, fim).join("\n");
    }
    return texto; // o último título não é "Relacionado": não mexe
  }
  return texto;
}

export function NoteRender({
  body, existentes, onAbrirTitulo, onAlternarTarefa, className,
}: Props) {
  const texto = useMemo(
    () => prepararWikilinks(semSecaoFinalRelacionado(body)),
    [body]
  );

  if (!body.trim()) {
    return <p className="text-sm italic text-white/25">Nota vazia. Toque em escrever pra começar.</p>;
  }

  return (
    <div className={cn("nota-lida space-y-3 text-sm leading-relaxed text-white/80", className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        /**
         * O `react-markdown` higieniza URL e descarta protocolo que não
         * conhece — o que apagava `wikilink:` e `anexo:`, deixando os links
         * do Obsidian como <a> sem destino. Libera só esses dois, que são
         * internos e nunca viram navegação; todo o resto continua passando
         * pela higienização padrão (é ela que barra `javascript:`).
         */
        urlTransform={(url) =>
          url.startsWith(PROTO) || url.startsWith(ANEXO) ? url : defaultUrlTransform(url)
        }
        components={{
          h1: ({ children }) => <h1 className="mt-4 text-lg font-black tracking-tight text-white first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-4 text-base font-black tracking-tight text-white first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-3 text-sm font-bold text-white/95">{children}</h3>,
          h4: ({ children }) => <h4 className="mt-3 text-xs font-bold uppercase tracking-wider text-white/60">{children}</h4>,
          p: ({ children }) => <p className="text-sm leading-relaxed text-white/75">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-white/70">{children}</em>,
          del: ({ children }) => <del className="text-white/35 line-through">{children}</del>,
          hr: () => <hr className="my-4 border-white/10" />,
          ul: ({ children }) => <ul className="ml-1 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-1 list-inside list-decimal space-y-1 marker:text-white/35">{children}</ol>,
          li: ({ children, node, ...rest }) => {
            // Item de tarefa vem com checkbox do GFM; sem ele, marcador próprio.
            const temCaixa = (rest as { className?: string }).className?.includes("task-list-item");
            const li = (
              <li className={cn("text-sm text-white/75", temCaixa ? "list-none" : "list-none pl-4 -indent-4 before:mr-2 before:text-white/30 before:content-['•']")}>
                {children}
              </li>
            );
            if (!temCaixa) return li;
            // A linha vem daqui porque o checkbox do GFM é sintético e não
            // tem posição própria (medido: `position` vem sempre null).
            return (
              <LinhaDaTarefa.Provider
                value={{ linha: node?.position?.start?.line ?? null, alternar: onAlternarTarefa }}
              >
                {li}
              </LinhaDaTarefa.Provider>
            );
          },
          input: ({ checked }) => <CaixaDeTarefa checked={checked} />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 bg-white/[0.03] py-1.5 pl-3 pr-2 text-sm italic text-white/65">
              {children}
            </blockquote>
          ),
          code: ({ className: cls, children }) => {
            const emBloco = /language-/.test(cls ?? "");
            if (emBloco) {
              return <code className="block whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-white/70">{children}</code>;
            }
            return <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-white/85">{children}</code>;
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl border border-white/[0.07] bg-black/40 p-3">{children}</pre>
          ),
          // Tabela em 43% das notas: precisa rolar sozinha, senão estoura a
          // janela em vez de ganhar barra própria.
          table: ({ children }) => (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-white/15">{children}</thead>,
          th: ({ children }) => <th className="px-2 py-1.5 text-left font-bold text-white/85">{children}</th>,
          td: ({ children }) => <td className="border-t border-white/[0.06] px-2 py-1.5 align-top text-white/70">{children}</td>,
          a: ({ href, children }) => {
            const url = href ?? "";
            if (url.startsWith(PROTO)) {
              const alvo = decodeURIComponent(url.slice(PROTO.length));
              const existe = existentes.has(alvo.toLowerCase());
              return (
                <button
                  type="button"
                  onClick={() => onAbrirTitulo(alvo)}
                  title={existe ? `Abrir “${alvo}”` : `Criar “${alvo}”`}
                  className={cn(
                    "mx-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-baseline text-[12px] transition-colors",
                    existe
                      ? "bg-primary/20 text-primary-foreground/90 hover:bg-primary/35"
                      : "border border-dashed border-white/20 text-white/40 hover:text-white/70"
                  )}
                >
                  <Icon as={Link21} size={11} />
                  {children}
                  {!existe && <span className="text-white/30">+</span>}
                </button>
              );
            }
            if (url.startsWith(ANEXO)) {
              // O binário vive no cofre; o CRM não tem os anexos.
              return (
                <span
                  title="Anexo do cofre — abra no Obsidian para ver"
                  className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[12px] text-white/40"
                >
                  <Icon as={Gallery} size={11} />
                  {children}
                </span>
              );
            }
            return (
              <a
                href={url}
                target="_blank"
                // noreferrer junto: sem ele a página aberta ganha acesso a
                // window.opener e pode redirecionar esta aba.
                rel="noopener noreferrer"
                className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => (
            <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} className="my-2 max-w-full rounded-xl" />
          ),
        }}
      >
        {texto}
      </Markdown>
    </div>
  );
}
