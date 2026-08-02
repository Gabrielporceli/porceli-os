import { memo, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { ImageIcon, Upload, X } from 'lucide-react';
import type { ImageNodeData } from '../../../types/funnel';
import { useFunnelActions } from '../funnelContext';

type ImageNodeProps = NodeProps & { data: ImageNodeData };

function ImageNodeImpl({ id, data }: ImageNodeProps) {
  const { updateNodeData, deleteNode } = useFunnelActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateNodeData(id, { src: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="group relative flex h-44 w-56 flex-col overflow-hidden rounded-lg border border-porceli-gray-700 bg-porceli-gray-900 shadow-lg">
      <button
        type="button"
        onClick={() => deleteNode(id)}
        className="nodrag absolute right-1.5 top-1.5 z-10 rounded bg-black/50 p-1 text-porceli-gray-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
        title="Remover"
      >
        <X size={13} />
      </button>

      {data.src ? (
        <img src={data.src} alt="" className="h-full w-full object-cover" />
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="nodrag flex h-full w-full flex-col items-center justify-center gap-1.5 text-porceli-gray-500 hover:bg-porceli-gray-800 hover:text-porceli-gray-300"
        >
          <ImageIcon size={22} />
          <span className="flex items-center gap-1 text-[11px]">
            <Upload size={11} /> Enviar imagem
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

export const ImageNode = memo(ImageNodeImpl);
