/**
 * O filtro do mural, num lugar só.
 *
 * Mora fora da página porque o laboratório (/dev/notas) precisa do MESMO
 * filtro: laboratório com cópia da regra testa a cópia, não o produto, e
 * as duas divergem na primeira mudança.
 */
import type { NoteComEstado } from "./useNotes";

/**
 * Nota índice: existe só pra ligar as pastas no Obsidian, onde não há árvore
 * de pastas na tela de leitura. Aqui a árvore da barra lateral faz esse
 * trabalho, então ela é ruído no mural.
 *
 * O critério é a ETIQUETA, que você escreve, e não adivinhação pelo conteúdo.
 * Tentei "nota cujo corpo é quase só link": marcava `Frases e Citações` e
 * `Script de Prospecção WhatsApp` como índice, porque o conteúdo delas é todo
 * em citação `>` e some da contagem. Etiqueta erra zero e você controla: pôs
 * `índice` no Obsidian, some do mural.
 */
export function ehNotaIndice(n: { tags: string[] }): boolean {
  return n.tags.some((t) => t.trim().toLowerCase() === "índice");
}


export interface Criterios {
  pastaAtiva: string | null;
  etiquetas: string[];
  busca: string;
  mostrarIndices: boolean;
}

export function filtrarNotas(notas: NoteComEstado[], c: Criterios): NoteComEstado[] {
  const q = c.busca.trim().toLowerCase();
  return notas.filter((n) => {
    // Índice existe pra ligar pasta no Obsidian. Aqui a árvore da lateral faz
    // isso, então é ruído no mural — mas segue alcançável pelo interruptor e
    // por qualquer [[link]] que aponte pra ela.
    if (!c.mostrarIndices && ehNotaIndice(n)) return false;

    // Pasta filtra o RAMO: escolher "Marketing" tem de trazer o que está em
    // "Marketing/Psicologia" também, senão clicar numa pasta com subpastas
    // devolve vazio e parece defeito.
    if (
      c.pastaAtiva !== null &&
      n.folder !== c.pastaAtiva &&
      !n.folder.startsWith(`${c.pastaAtiva}/`)
    ) {
      return false;
    }

    // E, não OU: marcar "copy" e "vendas" mostra o que tem as duas. Com OU,
    // cada etiqueta a mais ALARGA o resultado — o oposto do que se espera ao
    // clicar num filtro.
    if (c.etiquetas.length && !c.etiquetas.every((t) => n.tags.includes(t))) return false;

    if (!q) return true;
    return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
  });
}
