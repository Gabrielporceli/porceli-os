import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AgentIcon } from "@/components/icons/AgentIcon";
import { IlhaDinamica, type IlhaHandle } from "./IlhaDinamica";

interface Pendente {
  id: string;
  titulo: string;
}

/** Já mostrou o resumo "N pendentes" nesta abertura do app. */
const CHAVE_RESUMO = "ilha-aprovacoes-resumo";

const jaMostrouResumo = () => {
  try {
    return sessionStorage.getItem(CHAVE_RESUMO) === "1";
  } catch {
    return false;
  }
};
const marcarResumo = () => {
  try {
    sessionStorage.setItem(CHAVE_RESUMO, "1");
  } catch {
    /* sem sessionStorage (modo privado): o resumo só reaparece ao reabrir */
  }
};

/**
 * Liga a gota da ilha às aprovações dos agentes (celular).
 *
 * Recebe a MESMA lista que o Header já busca a cada 30 s (não busca de novo):
 *   • ao abrir o app com pedidos esperando, mostra o resumo uma vez;
 *   • quando chega um pedido novo com o app aberto, mostra o título dele.
 * Tocar leva pra Central de Agentes com o painel de Aprovações aberto.
 */
export function IlhaAprovacoes({ lista }: { lista: Pendente[] | null }) {
  const ilha = useRef<IlhaHandle>(null);
  const navigate = useNavigate();
  const vistos = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!lista) return;
    const abrir = () => navigate("/agents?aprovacoes=1");
    const icone = <AgentIcon className="h-6 w-6" />;
    const anteriores = vistos.current;
    vistos.current = new Set(lista.map((a) => a.id));

    // Primeira leitura: resumo do que já estava esperando.
    if (anteriores === null) {
      if (lista.length === 0 || jaMostrouResumo()) return;
      marcarResumo();
      const t = window.setTimeout(() => {
        ilha.current?.avisar({
          id: "resumo",
          titulo: lista.length === 1 ? "1 aprovação pendente" : `${lista.length} aprovações pendentes`,
          mensagem: lista.length === 1 ? lista[0].titulo : "Toque para decidir",
          icone,
          selo: lista.length > 1 ? lista.length : undefined,
          curto: lista.length === 1 ? "Aprovação" : "Aprovações",
          direita: lista.length === 1 ? "1 pendente" : `${lista.length} pendentes`,
          aoTocar: abrir,
        });
      }, 1200);
      return () => window.clearTimeout(t);
    }

    const novos = lista.filter((a) => !anteriores.has(a.id));
    if (novos.length === 0) return;
    ilha.current?.avisar({
      id: novos[0].id,
      titulo: novos.length === 1 ? "Nova aprovação" : `${novos.length} novas aprovações`,
      mensagem: novos.length === 1 ? novos[0].titulo : "Toque para decidir",
      icone,
      selo: lista.length > 1 ? lista.length : undefined,
      curto: novos.length === 1 ? "Aprovação" : "Aprovações",
      direita: novos.length === 1 ? "1 nova" : `${novos.length} novas`,
      aoTocar: abrir,
    });
  }, [lista, navigate]);

  return <IlhaDinamica ref={ilha} />;
}
