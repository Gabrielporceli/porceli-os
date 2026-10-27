import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ditado pelo reconhecimento de voz do navegador (Web Speech API).
 *
 * Funciona no Chrome e no Edge; no Chrome o áudio é processado nos servidores
 * do Google. Se um dia precisar ser privado, troca-se por Whisper na VPS
 * mantendo esta mesma interface (start/stop/onFinal).
 */

// O TypeScript não traz os tipos da Web Speech API; o mínimo que usamos.
interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROS: Record<string, string> = {
  "not-allowed": "Permissão do microfone negada",
  "service-not-allowed": "Permissão do microfone negada",
  "audio-capture": "Nenhum microfone encontrado",
  network: "Sem conexão com o serviço de voz do navegador",
  "no-speech": "Não ouvi nada",
};

export function useDictation(onFinal: (texto: string) => void, lang = "pt-BR") {
  const suportado = typeof window !== "undefined" && !!getCtor();
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const parar = useCallback(() => recRef.current?.stop(), []);

  const iniciar = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || recRef.current) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interino = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (r.isFinal) {
          const limpo = t.trim();
          if (limpo) onFinalRef.current(limpo);
        } else {
          interino += t;
        }
      }
      setParcial(interino.trim());
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setErro(ERROS[e.error] ?? `Erro no ditado (${e.error})`);
    };
    rec.onend = () => {
      recRef.current = null;
      setOuvindo(false);
      setParcial("");
    };
    recRef.current = rec;
    setErro(null);
    setOuvindo(true);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setOuvindo(false);
    }
  }, [lang]);

  // Some o aviso de erro sozinho.
  useEffect(() => {
    if (!erro) return;
    const t = setTimeout(() => setErro(null), 4000);
    return () => clearTimeout(t);
  }, [erro]);

  useEffect(() => () => recRef.current?.abort(), []);

  return { suportado, ouvindo, parcial, erro, iniciar, parar, alternar: ouvindo ? parar : iniciar };
}
