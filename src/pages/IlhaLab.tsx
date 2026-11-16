import { useRef, useState } from "react";
import { AgentIcon } from "@/components/icons/AgentIcon";
import { IlhaDinamica, type IlhaHandle } from "@/features/ilha/IlhaDinamica";
import { appBackgroundStyle } from "@/lib/appBackground";

/**
 * /dev/ilha — a gota da Ilha Dinâmica com uma ilha de mentira desenhada no
 * topo, pra ver a animação fora do iPhone. No aparelho a ilha é o próprio
 * recorte da tela e o aviso é disparado pelas aprovações dos agentes
 * (IlhaAprovacoes). Pública, sem layout.
 */
export default function IlhaLab() {
  const ilha = useRef<IlhaHandle>(null);
  const [comIlha, setComIlha] = useState(true);
  const icone = <AgentIcon className="h-6 w-6" />;
  const botao = "rounded-full bg-white/10 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white";

  return (
    <div className="min-h-screen px-4 pb-10 pt-56 text-white" style={appBackgroundStyle}>
      <IlhaDinamica ref={ilha} temIlha={comIlha} insetTopo={comIlha ? 59 : 0} ilhaVisivel={comIlha} />
      <div className="mx-auto flex max-w-sm flex-col gap-3">
        <h1 className="text-xl font-black tracking-tight">Ilha — avisos</h1>
        <p className="text-sm text-white/50">Toque no aviso para acionar; arraste para cima para recolher.</p>
        <button
          className={botao}
          onClick={() =>
            ilha.current?.avisar({
              id: String(Date.now()),
              titulo: "Nova aprovação",
              mensagem: "Responder avaliação de Neto Rocha no Google — Lapace",
              icone,
            })
          }
        >
          Nova aprovação
        </button>
        <button
          className={botao}
          onClick={() =>
            ilha.current?.avisar({ id: "resumo", titulo: "3 aprovações pendentes", mensagem: "Toque para decidir", icone, selo: 3 })
          }
        >
          Resumo com número
        </button>
        <button
          className={botao}
          onClick={() =>
            ilha.current?.avisar({ id: "fixo", titulo: "Fica aberto", mensagem: "Até tocar ou arrastar", icone, duracao: null })
          }
        >
          Sem tempo para fechar
        </button>
        <button className={botao} onClick={() => ilha.current?.fechar()}>
          Recolher
        </button>
        <button className={botao} onClick={() => setComIlha((v) => !v)}>
          {comIlha ? "Simular aparelho sem ilha" : "Simular iPhone com ilha"}
        </button>
      </div>
    </div>
  );
}
