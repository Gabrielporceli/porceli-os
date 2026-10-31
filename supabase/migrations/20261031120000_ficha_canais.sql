-- ─────────────────────────────────────────────────────────────────────────
-- Ficha do cliente: canais da marca e a autorização para analisá-los.
--
-- Com o @ do Instagram, o site e os outros canais, a Pesquisa analisa a
-- comunicação real da marca (posts, criativos, oferta do site) e propõe
-- melhorias na ficha. Só com `autoriza_analise_canais` = true.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.client_fichas
  add column if not exists instagram               text,
  add column if not exists site                    text,
  add column if not exists outros_canais           text,
  add column if not exists autoriza_analise_canais boolean;

notify pgrst, 'reload schema';
