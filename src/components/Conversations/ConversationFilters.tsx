
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";

interface ConversationFiltersProps {
  onFiltersChange: (filters: { tags: string[], direction: string[] }) => void;
}

export function ConversationFilters({ onFiltersChange }: ConversationFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);

  const availableTags = ["Lead", "Cliente", "Prospect"];
  const availableDirections = ["Entrada", "Saída"];

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
  };

  const toggleDirection = (direction: string) => {
    const newDirections = selectedDirections.includes(direction)
      ? selectedDirections.filter(d => d !== direction)
      : [...selectedDirections, direction];
    setSelectedDirections(newDirections);
  };

  const applyFilters = () => {
    onFiltersChange({
      tags: selectedTags,
      direction: selectedDirections
    });
    setIsOpen(false);
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedDirections([]);
    onFiltersChange({ tags: [], direction: [] });
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedDirections.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={`btn-outline ${hasActiveFilters ? 'border-goat-purple text-goat-purple' : ''}`}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <Badge className="ml-2 bg-goat-purple text-white text-xs">
              {selectedTags.length + selectedDirections.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-goat-gray-800 border-goat-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Filtrar Conversas</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <h4 className="text-white font-medium mb-3">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "secondary"}
                  className={`cursor-pointer ${
                    selectedTags.includes(tag)
                      ? "bg-goat-purple text-white"
                      : "bg-goat-gray-700 text-goat-gray-300 hover:bg-goat-gray-600"
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-3">Direção</h4>
            <div className="flex flex-wrap gap-2">
              {availableDirections.map((direction) => (
                <Badge
                  key={direction}
                  variant={selectedDirections.includes(direction) ? "default" : "secondary"}
                  className={`cursor-pointer ${
                    selectedDirections.includes(direction)
                      ? "bg-goat-purple text-white"
                      : "bg-goat-gray-700 text-goat-gray-300 hover:bg-goat-gray-600"
                  }`}
                  onClick={() => toggleDirection(direction)}
                >
                  {direction}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="btn-outline"
            >
              <X className="w-4 h-4" />
              Limpar
            </Button>
            <Button onClick={applyFilters} className="btn-primary">
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
