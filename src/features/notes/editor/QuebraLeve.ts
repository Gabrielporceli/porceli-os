/**
 * Quebra de linha dentro do parágrafo, preservada como quebra limpa.
 *
 * O PROBLEMA QUE ISTO RESOLVE. Com o padrão (`breaks: false`), uma quebra
 * simples entre duas linhas é ENGOLIDA, e o texto cola:
 *
 *     **A caverna = o mundo sensível**
 *     **As sombras = as coisas materiais**
 *       ↓
 *     **A caverna = o mundo sensívelAs sombras = as coisas materiais**
 *
 * Medido em 5 notas reais. Não é cosmético: palavras grudam uma na outra.
 *
 * Ligar `breaks: true` conserta a colagem, mas aí o serializador do
 * tiptap-markdown escreve `\` antes da quebra (é a forma canônica de quebra
 * forte em Markdown) — e o texto deixa de ser igual ao que entrou, com uma
 * contrabarra nova em cada linha. Como o objetivo é ida e volta idêntica,
 * aqui a quebra sai como quebra e ponto.
 *
 * Dentro de tabela continua valendo o comportamento original (`<br>`), porque
 * quebra crua ali arrebentaria a linha da tabela.
 */
import { HardBreak } from "@tiptap/extension-hard-break";

interface EstadoDeEscrita {
  write(texto: string): void;
  inTable?: boolean;
  /** Texto acumulado. O tiptap-markdown tambem mexe nele direto. */
  out: string;
  /** Prefixo do bloco atual: "> " dentro de citacao, "" fora. */
  delim: string;
}

export const QuebraLeve = HardBreak.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: EstadoDeEscrita) {
          if (state.inTable) {
            state.write("<br>");
            return;
          }
          // Escreve a quebra E o prefixo do bloco. Um `write` simples não
          // serve: dentro de citação o `> ` da linha seguinte só sai quando
          // o serializador passa por `write`, e a marca de negrito que vem
          // logo depois é acrescentada direto no `out`. Sem o prefixo aqui a
          // segunda linha da citação perde o `>` e os `**` colidem — medido
          // em 5 notas, e piorando a cada gravação.
          state.out += "\n" + (state.delim ?? "");
        },
        parse: {
          // vem do markdown-it com `breaks: true`
        },
      },
    };
  },
});
