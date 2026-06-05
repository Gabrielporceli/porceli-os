
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Save, X, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTags, type Tag } from "@/hooks/useTags";

interface TagsManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultColors = [
  "bg-purple-600",
  "bg-blue-600",
  "bg-green-600",
  "bg-yellow-600",
  "bg-red-600",
  "bg-pink-600",
  "bg-indigo-600",
  "bg-orange-600"
];

export function TagsManagementModal({ open, onOpenChange }: TagsManagementModalProps) {
  const { tags, isLoading, createTag, updateTag, deleteTag } = useTags();
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(defaultColors[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      await createTag({
        name: newTagName.trim(),
        color: newTagColor
      });
      setNewTagName("");
      setNewTagColor(defaultColors[0]);
      setIsCreating(false);
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  };

  const handleEditTag = (tag: Tag) => setEditingTag({ ...tag });

  const handleSaveEdit = async () => {
    if (!editingTag || !editingTag.name.trim()) return;

    try {
      await updateTag(editingTag.id, {
        name: editingTag.name.trim(),
        color: editingTag.color
      });
      setEditingTag(null);
    } catch (error) {
      console.error('Erro ao editar tag:', error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag(tagId);
    } catch (error) {
      console.error('Erro ao deletar tag:', error);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-white/[0.05] text-white max-w-2xl min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <div className="text-white/50 font-medium">Carregando tags...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white max-w-2xl !p-0 !gap-0 overflow-hidden">
        <div className="p-6 border-b border-white/[0.05]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight text-white">Gerenciar Tags</DialogTitle>
            <DialogDescription className="text-white/40">
              Crie, edite ou remova tags para categorizar seus leads
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-100px)] custom-scrollbar p-6 pt-4">
          <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.02);
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #6829c0;
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #7C3AED;
            }
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #6829c0 transparent;
            }
          `}</style>
          
          <div className="space-y-6 pt-2">
            {/* Create New Tag */}
          <div className="liquid-glass border-white/[0.05] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">Nova Tag</h4>
              {!isCreating && (
                <motion.div 
                  whileHover={{ scale: 1.05, translateY: -2 }} 
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    size="sm"
                    onClick={() => setIsCreating(true)}
                    className="bg-primary hover:bg-primary/90 text-white h-9 px-5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Adicionar
                  </Button>
                </motion.div>
              )}
            </div>
            {isCreating && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm font-medium">Nome da Tag</Label>
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Ex: Cliente VIP"
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm font-medium">Escolha uma Cor</Label>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className={`w-9 h-9 rounded-full ${color} transition-all ${newTagColor === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110 shadow-lg'
                          : 'opacity-60 hover:opacity-100 hover:scale-105'
                          }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.div 
                    className="flex-1" 
                    whileHover={{ scale: 1.05, translateY: -2 }} 
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setNewTagName("");
                        setNewTagColor(defaultColors[0]);
                      }}
                      className="btn-danger-glass w-full h-11 rounded-xl font-bold transition-all"
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
                    <Button onClick={handleCreateTag} className="bg-primary hover:bg-primary/90 text-white w-full h-11 rounded-xl font-bold transition-all">
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Tag
                    </Button>
                  </motion.div>
                </div>
              </div>
            )}
          </div>

          {/* Existing Tags */}
          <div className="liquid-glass border-white/[0.05] rounded-2xl p-5">
            <h4 className="font-semibold text-white mb-4">Tags Existentes</h4>
            {tags.length === 0 ? (
              <div className="py-8 text-center bg-white/[0.01] border border-dashed border-white/[0.05] rounded-xl">
                <p className="text-white/30 text-sm">Nenhuma tag criada ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {tags.map((tag) => (
                  <div key={tag.id} className="group flex items-center justify-between p-4 liquid-glass hover:bg-white/[0.02] border border-white/[0.05] rounded-2xl transition-all">
                    {editingTag?.id === tag.id ? (
                      <div className="flex flex-col gap-4 w-full">
                        <div className="flex items-center gap-3">
                          <Input
                            value={editingTag.name}
                            onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                            className="bg-white/[0.05] border-white/[0.1] text-white h-10 rounded-xl"
                            placeholder="Editar nome"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {defaultColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditingTag({ ...editingTag, color })}
                              className={`w-7 h-7 rounded-full ${color} transition-all ${editingTag.color === color
                                ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-110'
                                : 'opacity-50 hover:opacity-100'
                                }`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                          <motion.div 
                            whileHover={{ scale: 1.05, translateY: -2 }} 
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Button
                              onClick={() => setEditingTag(null)}
                              className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 h-9 px-4 rounded-xl font-bold transition-all"
                            >
                              Cancelar
                            </Button>
                          </motion.div>
                          <motion.div 
                            whileHover={{ scale: 1.05, translateY: -2 }} 
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Button onClick={handleSaveEdit} className="bg-primary hover:bg-primary/90 text-white h-9 px-4 rounded-xl font-bold transition-all">
                              <Save className="w-4 h-4 mr-2" />
                              Salvar
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${tag.color}`} />
                          <span className="font-semibold text-white/90">{tag.name}</span>
                        </div>
                        <div className="flex gap-2 transition-opacity">
                          <motion.div 
                            whileHover={{ scale: 1.1, translateY: -2 }} 
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Button
                              onClick={() => handleEditTag(tag)}
                              size="sm"
                              variant="ghost"
                              className="h-8 px-3 rounded-xl font-bold text-white/80 hover:bg-white/10 hover:text-white transition-all"
                            >
                              <Edit className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                              Editar
                            </Button>
                          </motion.div>
                          <motion.div 
                            whileHover={{ scale: 1.1, translateY: -2 }} 
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Button
                              onClick={() => handleDeleteTag(tag.id)}
                              size="sm"
                              variant="ghost"
                              className="h-8 px-3 rounded-xl font-bold text-red-500/80 hover:bg-red-500/10 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5 text-red-500/80" />
                              Excluir
                            </Button>
                          </motion.div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
