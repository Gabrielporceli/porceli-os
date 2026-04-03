// Em seu arquivo: /components/ColorPicker.tsx

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  label?: string;
}

const predefinedColors = [
  { name: "Roxo", value: "bg-purple-600 text-white hover:bg-purple-700" },
  { name: "Azul", value: "bg-blue-600 text-white hover:bg-blue-700" },
  { name: "Verde", value: "bg-green-600 text-white hover:bg-green-700" },
  { name: "Vermelho", value: "bg-red-600 text-white hover:bg-red-700" },
  { name: "Rosa", value: "bg-pink-600 text-white hover:bg-pink-700" },
  { name: "Amarelo", value: "bg-yellow-600 text-white hover:bg-yellow-700" },
  { name: "Laranja", value: "bg-orange-600 text-white hover:bg-orange-700" },
  { name: "Índigo", value: "bg-indigo-600 text-white hover:bg-indigo-700" },
  { name: "Cinza", value: "bg-gray-600 text-white hover:bg-gray-700" },
  { name: "Teal", value: "bg-teal-600 text-white hover:bg-teal-700" },
];

export function ColorPicker({ 
  selectedColor, 
  onColorChange, 
  label = "Cor da Tag" 
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getSelectedColorName = () => {
    const found = predefinedColors.find(color => color.value === selectedColor);
    return found ? found.name : "Personalizada";
  };

  return (
    <div className="space-y-2">
      <label className="text-white text-sm font-medium">{label}</label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {/* MUDANÇA CRÍTICA: Trocamos o <Button> da UI Library por um <button> HTML padrão.
            Isso evita TODOS os estilos herdados indesejados. Estilizamos ele do zero
            para se parecer exatamente com os seus Inputs.
          */}
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md border border-goat-gray-600 bg-goat-gray-700 px-3 py-2 text-sm text-white ring-offset-goat-gray-800 placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-goat-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${selectedColor.split(' ')[0]}`} />
              <span>{getSelectedColorName()}</span>
            </div>
            {/* Se quiser uma seta, adicione o ícone ChevronDown aqui */}
          </button>
        </PopoverTrigger>
        <PopoverContent
          // Aplicamos o estilo correto também no conteúdo do popover.
          className="w-auto rounded-lg border border-goat-gray-700 bg-goat-gray-800 p-2 shadow-lg"
          sideOffset={5}
        >
          <div className="grid grid-cols-5 gap-2">
            {predefinedColors.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => {
                  onColorChange(color.value);
                  setIsOpen(false);
                }}
                className={`w-10 h-10 rounded-md border-2 p-0 transition-all ${
                  selectedColor === color.value
                    ? 'border-white'
                    : 'border-transparent hover:border-gray-400'
                } ${color.value.split(' ')[0]}`}
                title={color.name}
              >
                {selectedColor === color.value && (
                  <Check className="mx-auto h-4 w-4 text-white" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}