/** Endereços que costumam ser áreas logadas: o serviço de captura abre o site
 *  como visitante anônimo, então nunca mostraria o conteúdo real. */
const PRIVATE_URL = /\/(wp-)?admin|\/login|\/dashboard|\/painel/i;

/** Preview desligado: escolha explícita do card, ou (sem escolha) endereço que
 *  parece área logada. */
export function isPreviewDisabled(data: { url?: string; noPreview?: unknown }): boolean {
  if (typeof data.noPreview === 'boolean') return data.noPreview;
  return PRIVATE_URL.test(data.url ?? '');
}
