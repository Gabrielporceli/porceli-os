-- Texto que o agente quer publicar (ex.: resposta a uma avaliação do Google).
-- O Gabriel edita no painel de Aprovações antes de aprovar; o que fica gravado
-- aqui é exatamente o que será publicado.
alter table public.agente_aprovacoes add column if not exists texto text;
comment on column public.agente_aprovacoes.texto is
  'Texto a publicar se aprovado. Editável pelo Gabriel no painel; o executor usa este valor.';
