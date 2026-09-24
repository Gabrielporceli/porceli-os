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
interface Resultado { nome: string; antes: number; depois: number; sumiram: string; escapes: number; trecho: string; estavel: boolean; dif: string; ondeEscapou: string }

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

/**
 * QUALQUER contrabarra de escape nova.
 *
 * Antes eu contava só as de colchete, o que escondia a contrabarra que o
 * serializador põe antes da quebra de linha — o editor podia estar sujando
 * o texto inteiro e o portão daria verde.
 */
function contarEscapes(s: string): number {
  return (s.match(/\\[\s\S]/g) ?? []).length;
}

export default function RoundTripLab() {
  const [res, setRes] = useState<Resultado[] | null>(null);
  const [casos, setCasos] = useState<Array<[string, string, string]>>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [dataview, setDataview] = useState<[string, string] | null>(null);

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
          // Idempotencia: salvar de novo nao pode continuar mudando o texto.
          // Se mudar a cada volta, o arquivo degrada sozinho a cada gravacao.
          editor.commands.setContent(volta);
          const volta2 = md();
          const b = new Set(palavras(volta));
          const sumiram = palavras(n.corpo).filter((w) => !b.has(w));
          saida.push({
            nome: n.nome,
            antes: n.corpo.length,
            depois: volta.length,
            sumiram: sumiram.slice(0, 10).join(" · "),
            // Só conta escape NOVO: se a nota já tinha `\[`, não é culpa nossa.
            escapes: Math.max(0, contarEscapes(volta) - contarEscapes(n.corpo)),
            estavel: volta.trim() === volta2.trim(),
            ondeEscapou: (() => {
              const m = /\\[\s\S]/.exec(volta);
              return m ? JSON.stringify(volta.slice(Math.max(0, m.index - 70), m.index + 70)) : "";
            })(),
            dif: (() => {
              if (volta.trim() === volta2.trim()) return "";
              let i = 0;
              while (i < volta.length && i < volta2.length && volta[i] === volta2[i]) i++;
              return (
                "1a: " + JSON.stringify(volta.slice(Math.max(0, i - 50), i + 50)) +
                "  ||  2a: " + JSON.stringify(volta2.slice(Math.max(0, i - 50), i + 50))
              );
            })(),
            // Trecho em volta da PRIMEIRA palavra sumida, nos dois lados: sem
            // isso a lista diz o que sumiu mas nao por que.
            trecho: (() => {
              if (!sumiram.length) return "";
              const alvo = sumiram[0];
              const i = n.corpo.indexOf(alvo);
              const j = volta.indexOf(alvo.slice(0, Math.max(3, alvo.length - 2)));
              return (
                "ANTES: " + JSON.stringify(n.corpo.slice(Math.max(0, i - 60), i + 60)) +
                "  ||  DEPOIS: " + (j >= 0 ? JSON.stringify(volta.slice(Math.max(0, j - 60), j + 60)) : "(nao achou)")
              );
            })(),
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
          ["embed de anexo", "Veja ![[icp-venn.svg]] acima."],
          ["embed com largura", "Veja ![[icp-venn.svg|398]] acima."],
          ["imagem markdown", "![alt](foto.png)"],
        ];
        const sc: Array<[string, string, string]> = [];
        for (const [nome, entrada] of CASOS) {
          editor.commands.setContent(entrada);
          sc.push([nome, entrada, md()]);
        }
        // Conferencia dirigida: a consulta dataview e o pedaco mais fragil
        // do cofre (regex com barras dentro de crase). Tem de voltar igual.
        const comDataview = notas.find((n) => n.corpo.includes("dataview"));
        if (comDataview) {
          editor.commands.setContent(comDataview.corpo);
          const v = md();
          const pegar = (s: string) => {
            const i = s.indexOf("regexreplace");
            return i < 0 ? "(nao achou)" : s.slice(i, i + 150);
          };
          setDataview([pegar(comDataview.corpo), pegar(v)]);
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
  const instaveis = res.filter((r) => !r.estavel);
  const passou = comEscape.length === 0 && comPerda.length === 0 && instaveis.length === 0;

  return (
    <div className="min-h-screen bg-[#0a0a0c] p-6 text-white">
      <h1 className="text-xl font-black">Portão do editor visual</h1>
      <p
        id="resumo"
        className={`mt-2 rounded-lg p-2 text-sm ${passou ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}
      >
        {res.length} notas · escapes novos: {comEscape.length} · perderam palavras: {comPerda.length}
        {" · instaveis na 2a volta: "}{instaveis.length}
        {passou ? " · PASSOU" : " · REPROVOU"}
      </p>

      {dataview && (
        <div id="dataview" className={`mt-4 rounded-lg p-2 text-xs ${dataview[0] === dataview[1] ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
          <b>consulta dataview {dataview[0] === dataview[1] ? "INTACTA" : "ALTERADA"}</b>
          <pre className="mt-1 whitespace-pre-wrap text-[10px] text-white/60">{dataview[0]}</pre>
          <pre className="mt-1 whitespace-pre-wrap text-[10px] text-white/80">{dataview[1]}</pre>
        </div>
      )}

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

      <h2 className="mt-6 text-sm font-bold text-fuchsia-300">Mudam de novo na 2a gravacao ({instaveis.length})</h2>
      <ul id="instaveis" className="mt-2 space-y-1 text-xs">
        {instaveis.slice(0, 12).map((r) => (<li key={r.nome} className="rounded bg-fuchsia-500/10 p-1.5"><b>{r.nome}</b><pre className="mt-1 whitespace-pre-wrap text-[10px] text-white/45">{r.dif}</pre></li>))}
      </ul>

      <h2 className="mt-6 text-sm font-bold text-red-400">Notas com escape novo ({comEscape.length})</h2>
      <ul id="escapes" className="mt-2 space-y-1 text-xs">
        {comEscape.slice(0, 12).map((r) => (
          <li key={r.nome} className="rounded bg-red-500/10 p-1.5">
            <b>{r.nome}</b> · {r.escapes} escapes · {r.antes}→{r.depois}
            <pre className="mt-1 whitespace-pre-wrap text-[10px] text-white/45">{r.ondeEscapou}</pre>
          </li>
        ))}
      </ul>

      <h2 className="mt-6 text-sm font-bold text-amber-300">Notas que perderam palavras ({comPerda.length})</h2>
      <ul id="perdas" className="mt-2 space-y-1 text-xs">
        {comPerda.slice(0, 12).map((r) => (
          <li key={r.nome} className="rounded bg-amber-500/10 p-1.5">
            <b>{r.nome}</b> {r.antes}→{r.depois} · sumiram: {r.sumiram}
            <pre className="mt-1 whitespace-pre-wrap text-[10px] text-white/40">{r.trecho}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
