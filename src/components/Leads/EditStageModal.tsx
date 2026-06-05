
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stage } from "@/hooks/useStages";
import { Save, Trash2 } from "lucide-react";

interface EditStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: Stage | null;
  onUpdateStage: (updatedStage: { name: string; color: string }) => void;
  onDeleteStage: (stageId: string) => void;
}

const colorOptions = [
  { value: "bg-gray-500", label: "Cinza", dot: "bg-gray-500" },
  { value: "bg-red-500", label: "Vermelho", dot: "bg-red-500" },
  { value: "bg-yellow-500", label: "Amarelo", dot: "bg-yellow-500" },
  { value: "bg-green-500", label: "Verde", dot: "bg-green-500" },
  { value: "bg-blue-500", label: "Azul", dot: "bg-blue-500" },
  { value: "bg-purple-500", label: "Roxo", dot: "bg-purple-500" },
  { value: "bg-pink-500", label: "Rosa", dot: "bg-pink-500" },
  { value: "bg-orange-500", label: "Laranja", dot: "bg-orange-500" },
];

export function EditStageModal({
  open,
  onOpenChange,
  stage,
  onUpdateStage,
  onDeleteStage,
}: EditStageModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("bg-gray-500");

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setColor(stage.color);
    }
  }, [stage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateStage({ name: name.trim(), color });
    onOpenChange(false);
  };

  if (!stage) return null;

  const getColorSelected = () => {
    const selected = colorOptions.find((opt) => opt.value === color);
    if (!selected) return <span className="text-white">Selecione</span>;
    return (
      <span className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${selected.dot}`} />
        {selected.label}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight text-white">Editar Etapa</DialogTitle>
          <DialogDescription className="text-white/40">
            Altere as informações e a cor da etapa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">

            <div className="space-y-2">
              <Label className="text-white/70 text-sm font-medium">Nome da Etapa *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                placeholder="Digite o nome da etapa"
                disabled={stage.is_default}
              />
              {stage.is_default && (
                <p className="text-xs text-white/30">
                  Etapas padrão não podem ter o nome alterado
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-sm font-medium">Cor da Etapa</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-11 rounded-xl text-white/70">
                  <SelectValue>{getColorSelected()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-3 font-medium">
                        <span className={`w-3 h-3 rounded-full ${option.dot}`} />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-white/[0.05]">
            <motion.div 
              className="flex-1" 
              whileHover={{ scale: 1.05, translateY: -2 }} 
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="btn-danger-glass w-full h-12 rounded-xl font-bold transition-all text-base"
              >
                Cancelar
              </Button>
            </motion.div>
            <motion.div 
              className="flex-[2]" 
              whileHover={{ scale: 1.05, translateY: -2 }} 
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white w-full h-12 rounded-xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold text-base transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </motion.div>
            {!stage.is_default && (
              <motion.div 
                whileHover={{ scale: 1.05, translateY: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  type="button"
                  onClick={() => {
                    onDeleteStage(stage.id);
                    onOpenChange(false);
                  }}
                  className="h-12 w-12 rounded-xl btn-danger-glass transition-all"
                  title="Excluir Etapa"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
