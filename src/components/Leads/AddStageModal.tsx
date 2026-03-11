import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { motion } from "framer-motion";

interface AddStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStage: (stage: { name: string; color: string }) => void;
}

const colorOptions = [
  { name: "Cinza", value: "bg-gray-500", dot: "bg-gray-500" },
  { name: "Vermelho", value: "bg-red-500", dot: "bg-red-500" },
  { name: "Amarelo", value: "bg-yellow-500", dot: "bg-yellow-500" },
  { name: "Verde", value: "bg-green-500", dot: "bg-green-500" },
  { name: "Azul", value: "bg-blue-500", dot: "bg-blue-500" },
  { name: "Roxo", value: "bg-purple-500", dot: "bg-purple-500" },
  { name: "Rosa", value: "bg-pink-500", dot: "bg-pink-500" },
  { name: "Laranja", value: "bg-orange-500", dot: "bg-orange-500" },
];

export function AddStageModal({ open, onOpenChange, onAddStage }: AddStageModalProps) {
  const [stageName, setStageName] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-gray-500");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stageName.trim()) {
      onAddStage({
        name: stageName.trim(),
        color: selectedColor,
      });
      setStageName("");
      setSelectedColor("bg-gray-500");
      onOpenChange(false);
    }
  };

  const getColorSelected = () => {
    const selected = colorOptions.find((opt) => opt.value === selectedColor);
    if (!selected) return <span className="text-white">Selecione uma cor</span>;
    return (
      <span className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${selected.dot}`} />
        {selected.name}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight text-white">Adicionar Nova Etapa</DialogTitle>
          <DialogDescription className="text-white/40">
            Crie uma nova etapa para organizar seus leads
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          <div className="space-y-2">
            <Label htmlFor="stage-name" className="text-white/70 text-sm font-medium">
              Nome da Etapa *
            </Label>
            <Input
              id="stage-name"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder="Ex: Negociação, Fechamento..."
              className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Cor da Etapa</Label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-11 rounded-xl text-white/70">
                <SelectValue>
                  {getColorSelected()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-3 font-medium">
                      <span className={`w-3 h-3 rounded-full ${option.dot}`} />
                      {option.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-3 pt-2 flex-row sm:flex-row !justify-stretch">
            <motion.div 
              className="flex-1" 
              whileHover={{ scale: 1.05, translateY: -2 }} 
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 w-full h-11 rounded-2xl font-bold transition-all text-base"
              >
                Cancelar
              </Button>
            </motion.div>
            <motion.div 
              className="flex-1" 
              whileHover={{ scale: 1.05, translateY: -2 }} 
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white w-full h-11 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold text-base transition-all"
              >
                Adicionar
              </Button>
            </motion.div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}