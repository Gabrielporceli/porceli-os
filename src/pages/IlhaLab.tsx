import { useRef, useState } from "react";
import { AgentIcon } from "@/components/icons/AgentIcon";
import { IlhaDinamica, type EstiloIlha, type IlhaHandle } from "@/features/ilha/IlhaDinamica";
import { appBackgroundStyle } from "@/lib/appBackground";
import { cn } from "@/lib/utils";

const ESTILOS: { id: EstiloIlha; nome: string; descricao: string }[] = [
  { id: "expandir", nome: "Expandir", descricao: "A ilha cresce e vira o cartão, como no iOS." },
  { id: "compacta", nome: "Compacta", descricao: "A ilha só alarga: ícone de um lado, número do outro." },
  { id: "gota", nome: "Gota", descricao: "Uma gota escorre da ilha e se abre num cartão." },
];

/**
 * /dev/ilha — os avisos da Ilha Dinâmica com uma ilha de mentira desenhada no
 * topo, pra comparar as animações fora do app instalado. No iPhone a ilha é
 * o próprio recorte da tela e o aviso é disparado pelas aprovações dos
 * agentes (IlhaAprovacoes). Pública, sem layout.
 */
export default function IlhaLab() {
  const ilha = useRef<IlhaHandle>(null);
  const [comIlha, setComIlha] = useState(true);
  const [estilo, setEstilo] = useState<EstiloIlha>("expandir");
  const icone = <AgentIcon className="h-6 w-6" />;
  const botao = "rounded-full bg-white/10 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white";

  return (
    <div className="min-h-screen px-4 pb-10 pt-52 text-white" style={appBackgroundStyle}>
      <IlhaDinamica ref={ilha} estilo={estilo} temIlha={comIlha} insetTopo={comIlha ? 59 : 0} ilhaVisivel={comIlha} />
      <div className="mx-auto flex max-w-sm flex-col gap-3">
        <h1 className="text-xl font-black tracking-tight">Ilha — avisos</h1>

        <div className="flex gap-2">
          {ESTILOS.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                ilha.current?.fechar();
                setEstilo(e.id);
              }}
              className={cn(
                "flex-1 rounded-full px-3 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors",
                estilo === e.id ? "bg-[#6829c0] text-white" : "bg-white/10 text-white/60",
              )}
            >
              {e.nome}
            </button>
          ))}
        </div>
        <p className="text-sm text-white/50">
          {ESTILOS.find((e) => e.id === estilo)?.descricao} Toque no aviso para acionar; arraste para cima para recolher.
        </p>

        <button
          className={botao}
          onClick={() =>
            ilha.current?.avisar({
              id: String(Date.now()),
              titulo: "Nova aprovação",
              mensagem: "Responder avaliação de Neto Rocha no Google — Lapace",
              icone,
              curto: "Aprovação",
              direita: "1 nova",
            })
          }
        >
          Nova aprovação
        </button>
        <button
          className={botao}
          onClick={() =>
            ilha.current?.avisar({
              id: "resumo",
              titulo: "3 aprovações pendentes",
              mensagem: "Toque para decidir",
              icone,
              selo: 3,
              curto: "Aprovações",
              direita: "3 pendentes",
            })
          }
        >
          Resumo com número
        </button>
        <button
          className={botao}
          onClick={() =>
            ilha.current?.avisar({
              id: "fixo",
              titulo: "Fica aberto",
              mensagem: "Até tocar ou arrastar",
              icone,
              duracao: null,
              curto: "Aprovação",
              direita: "1 nova",
            })
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
