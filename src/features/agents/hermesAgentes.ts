import type { AvatarColor } from "@/components/ui/orb-avatar";

/**
 * Agentes que existem no Hermes da VPS (um profile cada). Quem define o que
 * cada um faz é o repositório porceli-agentes; aqui só o que a tela mostra.
 * O id na tela é `hermes:<profile>`, e o terminal deles fala com o Hermes de
 * verdade pela função hermes-chat. Agentes criados à mão continuam em demonstração.
 */
export interface AgenteHermes {
  perfil: string;
  nome: string;
  papel: string;
  cor: AvatarColor;
  principal?: boolean;
}

export const AGENTES_HERMES: AgenteHermes[] = [
  { perfil: "elly", nome: "Elly", papel: "Orquestradora: conversa com você e delega pelo Kanban", cor: "violet", principal: true },
  { perfil: "analista", nome: "Analista", papel: "Análise diária de resultados por cliente", cor: "cyan" },
  { perfil: "estrategista", nome: "Estrategista", papel: "Plano de mídia e CPL máximo", cor: "purple" },
  { perfil: "especialista-tracking", nome: "Tracking", papel: "Especialista no Porceli Tracking", cor: "green" },
  { perfil: "especialista-os", nome: "Porceli OS", papel: "Especialista no Porceli OS", cor: "indigo" },
  { perfil: "operador-meta", nome: "Meta Ads", papel: "Sobe e ajusta campanhas na Meta (sempre pausado)", cor: "blue" },
  { perfil: "operador-google", nome: "Google Ads", papel: "Sobe e ajusta campanhas no Google (sempre pausado)", cor: "yellow" },
  { perfil: "cro", nome: "CRO", papel: "Auditoria de páginas e conversão", cor: "orange" },
  { perfil: "pesquisa", nome: "Pesquisa", papel: "Concorrência e mercado", cor: "pink" },
];

export const idHermes = (perfil: string) => `hermes:${perfil}`;
