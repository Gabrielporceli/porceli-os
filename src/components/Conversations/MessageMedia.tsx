import React from "react";
import { Download, Image as ImageIcon, FileAudio, FileVideo, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import WaveSurfer from 'wavesurfer.js';

interface MessageMediaProps {
  mediaType: string;
  mediaUrl: string;
  mediaFilename?: string;
  mediaSize?: number;
  isUserMessage: boolean;
}

export const MessageMedia: React.FC<MessageMediaProps> = ({
  mediaType,
  mediaUrl,
  mediaFilename,
  mediaSize,
  isUserMessage
}) => {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = mediaFilename || 'media';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openInNewTab = () => {
    window.open(mediaUrl, '_blank');
  };

  const [imageError, setImageError] = useState(false);

  // Renderizar imagens com preview inline
  if (mediaType?.startsWith('image/') || mediaType === 'imageMessage') {
    return (
      <div className="mt-1">
        <div className="relative group w-full">
          {(!mediaUrl || imageError) ? (
            <div
              className={`flex flex-col items-center justify-center w-[200px] h-32 rounded-xl border-2 border-dashed ${isUserMessage ? 'border-primary/40 bg-primary/20' : 'border-white/20 bg-white/[0.03]'
                }`}
            >
              <ImageIcon className={`w-8 h-8 mb-2 ${isUserMessage ? 'text-white' : 'text-white/40'
                }`} />
              <p className={`text-sm font-medium ${isUserMessage ? 'text-white' : 'text-white/60'
                }`}>
                Foto arquivada
              </p>
              <p className={`text-[10px] mt-1 text-center px-4 ${isUserMessage ? 'text-white/80' : 'text-white/30'
                }`}>
                Indisponível no servidor
              </p>
            </div>
          ) : (
            <img
              src={mediaUrl}
              alt="Imagem compartilhada"
              className="max-w-[280px] rounded-xl cursor-pointer hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
              onClick={openInNewTab}
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </div>
    );
  }

  // Renderizar áudios
  if (mediaType?.startsWith('audio/') || mediaType === 'audioMessage') {
    // Player customizado estilo WhatsApp com onda sonora animada
    const audioRef = useRef<HTMLAudioElement>(null);
    const waveRef = useRef<HTMLDivElement>(null);
    const waveSurferRef = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [waveWidth, setWaveWidth] = useState(0);

    useEffect(() => {
      if (!mediaUrl) return;

      if (waveRef.current && !waveSurferRef.current) {
        const audioEl = new window.Audio();
        audioEl.crossOrigin = 'anonymous';
        audioEl.src = mediaUrl;
        audioEl.preload = 'metadata';

        const ws = WaveSurfer.create({
          container: waveRef.current,
          waveColor: 'rgba(163, 163, 163, 0.6)',
          progressColor: 'white',
          barWidth: 2,
          barGap: 2,
          barRadius: 2,
          height: 32,
          cursorWidth: 0,
          media: audioEl,
        });

        waveSurferRef.current = ws;

        ws.on('ready', () => {
          setDuration(ws.getDuration() || 0);
          // Atualiza a largura para a bolinha baseada no container do react
          if (waveRef.current) {
            setWaveWidth(waveRef.current.offsetWidth);
          }
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));

        ws.on('audioprocess', () => {
          setCurrentTime(ws.getCurrentTime() || 0);
        });

        ws.on('interaction', () => {
          setCurrentTime(ws.getCurrentTime() || 0);
        });

        ws.on('finish', () => {
          setIsPlaying(false);
          setCurrentTime(0);
          ws.seekTo(0);
        });

        ws.on('error', (err) => {
          console.error("WaveSurfer Error: ", err);
        });
      }

      const handleResize = () => {
        if (waveRef.current) {
          setWaveWidth(waveRef.current.offsetWidth);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        if (waveSurferRef.current) {
          waveSurferRef.current.destroy();
          waveSurferRef.current = null;
        }
        window.removeEventListener('resize', handleResize);
      };
    }, [mediaUrl]);

    const togglePlay = () => {
      if (!waveSurferRef.current) return;
      if (isPlaying) {
        waveSurferRef.current.pause();
      } else {
        waveSurferRef.current.play();
      }
      setIsPlaying(!isPlaying);
    };

    const formatTime = (sec: number) => {
      if (isNaN(sec)) return "0:00";
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    // LOG para depuração
    console.log('AUDIO DEBUG:', { duration, waveWidth, currentTime });

    return (
      <div className="mt-1">
        <div className="flex items-center gap-3 px-2 py-1 w-full" style={{ position: 'relative' }}>
          <button
            onClick={mediaUrl ? togglePlay : undefined}
            className={`w-8 h-8 flex items-center justify-center bg-transparent focus:outline-none flex-shrink-0 transition-opacity ${!mediaUrl ? 'opacity-50 cursor-not-allowed' : 'opacity-100 hover:opacity-90'}`}
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="6" y="4" width="2.5" height="12" rx="1" fill="white" />
                <rect x="11.5" y="4" width="2.5" height="12" rx="1" fill="white" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <polygon points="7,5 15,10 7,15" fill="white" />
              </svg>
            )}
          </button>
          <div ref={waveRef} className="flex-1 min-w-0" style={{ width: '100%', position: 'relative', height: 32 }}>
            {/* Bolinha roxa sempre visível, usando largura do container como fallback */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: `${(currentTime / (duration || 1)) * (waveWidth || waveRef.current?.offsetWidth || 200)}px`,
                transform: 'translate(-50%, -50%)',
                width: 8,
                height: 8,
                background: isUserMessage ? '#ffffff' : '#A855F7',
                borderRadius: '50%',
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
                zIndex: 10,
                pointerEvents: 'none',
                transition: isPlaying ? 'none' : 'left 0.1s ease-out',
              }}
            />
          </div>
          <span className={`text-xs w-8 text-right tabular-nums select-none ${isUserMessage ? 'text-white' : 'text-white'
            }`} style={{ opacity: 1 }}>
            {formatTime(Math.max(0, duration - currentTime))}
          </span>
        </div>
      </div>
    );
  }

  // Renderizar vídeos
  if (mediaType?.startsWith('video/')) {
    return (
      <div className="mt-1">
        <div className="relative group max-w-xs">
          <video
            controls
            className="w-full rounded-lg shadow-md"
            preload="metadata"
          >
            <source src={mediaUrl} type={mediaType} />
            Seu navegador não suporta o elemento de vídeo.
          </video>

          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-none"
            onClick={handleDownload}
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Renderizar outros tipos de arquivo (documentos, etc.)
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('audio/')) return FileAudio;
    if (mimeType.includes('pdf')) return File;
    return File;
  };

  const FileIcon = getFileIcon(mediaType);

  return (
    <div className="mt-1">
      <div className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-opacity ${isUserMessage
        ? 'bg-transparent border-white/20'
        : 'bg-transparent border-white/10'
        }`}
        onClick={openInNewTab}
      >
        <FileIcon className={`w-6 h-6 ${isUserMessage ? 'text-white' : 'text-white/60'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isUserMessage ? 'text-white' : 'text-white/80'}`}>
            {mediaFilename || 'Arquivo'}
          </p>
          <p className={`text-xs ${isUserMessage ? 'text-white/70' : 'text-white/40'}`}>
            {mediaType} {mediaSize && `• ${formatFileSize(mediaSize)}`}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className={`h-8 w-8 p-0 hover:bg-white/10 ${isUserMessage ? 'text-white' : 'text-white/60'}`}
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
