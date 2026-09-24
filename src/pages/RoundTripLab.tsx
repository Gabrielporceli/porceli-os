/**
 * Portão do editor visual: mede a ida e volta Markdown → editor → Markdown
 * contra as 108 notas reais do cofre.
 *
 * Trocar o editor cru por um visual só é seguro se abrir uma nota e salvar de
 * volta NÃO estragar o que está lá. Usa `extensoesDaNota()`, a MESMA lista do
 * editor de verdade — medir outra configuração não mede nada.
 *
 * Os dados vêm de public/_roundtrip.json, gerado do cofre e fora do git.
 */
import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { extensoesDaNota, markdownDoEditor } from "@/features/notes/editor/extensoes";

interface Nota { nome: string; corpo: string }
interface Resultado { nome: string; antes: number; depois: number; sumiram: string; escapes: number }

const NL = "\n";
const ASPAS = '"';

/** As PALAVRAS sobreviveram? Espaço e marcação podem mudar; conteúdo não. */
function palavras(s: string): string[] {
  return s
    .replace(/\\/g, " ")
    .replace(/[|*_`#>\-+[\]()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/** Contrabarra antes de colchete: a assinatura exata do defeito que nos trouxe aqui. */
function contarEscapes(s: string): number {
  return (s.match(/\\[[\]]/g) ?? []).length;
}

export default function RoundTripLab() {
  const [res, setRes] = useState<Resultado[] | null>(null);
  const [casos, setCasos] = useState<Array<[string, string, string]>>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const notas: Nota[] = await (await fetch("/_roundtrip.json")).json();
        const editor = new Editor({ extensions: extensoesDaNota(), content: "" });
        const md = () => markdownDoEditor(editor);

        const saida: Resultado[] = [];
        for (const n of notas) {
          editor.commands.setContent(n.corpo);
          const volta = md();
          const b = new Set(palavras(volta));
          const sumiram = palavras(n.corpo).filter((w) => !b.has(w));
          saida.push({
            nome: n.nome,
            antes: n.corpo.length,
            depois: volta.length,
            sumiram: sumiram.slice(0, 10).join(" · "),
            // Só conta escape NOVO: se a nota já tinha `\[`, não é culpa nossa.
            escapes: Math.max(0, contarEscapes(volta) - contarEscapes(n.corpo)),
          });
        }

        const CASOS: Array<[string, string]> = [
          ["wikilink", "Ver [[Persuasao]] e [[Nota|apelido]]."],
          ["wikilink com secao", "Ver [[Nota#Uma secao]]."],
          ["tabela", ["| A | B |", "| --- | --- |", "| 1 | 2 |"].join(NL)],
          ["bloco de codigo", ["```dataview", "TABLE x FROM " + ASPAS + ASPAS, "```"].join(NL)],
          ["campo inline", "Campo [cat:: Trafego Pago] aqui."],
          ["tarefa", ["- [ ] fazer", "- [x] feito"].join(NL)],
          ["tarefa aninhada", ["- [ ] pai", "  - [x] filho"].join(NL)],
          ["citacao", "> uma citacao"],
          ["negrito e italico", "texto **forte** e *leve*"],
          ["titulo", "## Um titulo"],
          ["link normal", "[site](https://exemplo.com)"],
          ["separador", ["antes", "", "---", "", "depois"].join(NL)],
          ["lista simples", ["- um", "- dois"].join(NL)],
          ["wikilink DENTRO de tabela", ["| Area | O que e |", "| --- | --- |", "| [[Marca]] | a voz |"].join(NL)],
          ["colchete solto (script)", "Oi, [Nome]! Tudo bem?"],
        ];
        const sc: Array<[string, string, string]> = [];
        for (const [nome, entrada] of CASOS) {
          editor.commands.setContent(entrada);
          sc.push([nome, entrada, md()]);
        }
        setCasos(sc);
        editor.destroy();
        setRes(saida);
      } catch (e) {
        setErro(String(e));
      }
    })();
  }, []);

  if (erro) return <pre className="p-6 text-red-400">{erro}</pre>;
  if (!res) return <p className="p-6 text-white">medindo…</p>;

  const comEscape = res.filter((r) => r.escapes > 0);
  const comPerda = res.filter((r) => r.sumiram.length > 0);
  const passou = comEscape.length === 0 && comPerda.length === 0;

  return (
    <div className="min-h-screen bg-[#0a0a0c] p-6 text-white">
      <h1 className="text-xl font-black">Portão do editor visual</h1>
      <p
        id="resumo"
        className={`mt-2 rounded-lg p-2 text-sm ${passou ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}
      >
        {res.length} notas · escapes novos: {comEscape.length} · perderam palavras: {comPerda.length}
        {passou ? " · PASSOU" : " · REPROVOU"}
      </p>

      <h2 className="mt-6 text-sm font-bold text-sky-300">Casos isolados</h2>
      <table id="casos" className="mt-2 w-full text-xs">
        <tbody>
          {casos.map(([nome, antes, depois]) => (
            <tr key={nome} className={antes.trim() === depois.trim() ? "" : "bg-amber-500/10"}>
              <td className="w-40 border-t border-white/10 p-1.5 align-top font-bold">{nome}</td>
              <td className="border-t border-white/10 p-1.5 align-top">
                <pre className="whitespace-pre-wrap text-white/45">{antes}</pre>
              </td>
              <td className="border-t border-white/10 p-1.5 align-top">
                <pre className="whitespace-pre-wrap text-white/85">{depois}</pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-6 text-sm font-bold text-red-400">Notas com escape novo ({comEscape.length})</h2>
      <ul id="escapes" className="mt-2 space-y-1 text-xs">
        {comEscape.slice(0, 12).map((r) => (
          <li key={r.nome} className="rounded bg-red-500/10 p-1.5">
            <b>{r.nome}</b> · {r.escapes} escapes · {r.antes}→{r.depois}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 text-sm font-bold text-amber-300">Notas que perderam palavras ({comPerda.length})</h2>
      <ul id="perdas" className="mt-2 space-y-1 text-xs">
        {comPerda.slice(0, 12).map((r) => (
          <li key={r.nome} className="rounded bg-amber-500/10 p-1.5">
            <b>{r.nome}</b> {r.antes}→{r.depois} · sumiram: {r.sumiram}
          </li>
        ))}
      </ul>
    </div>
  );
}
