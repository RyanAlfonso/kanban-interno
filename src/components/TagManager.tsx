"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Edit, Plus, Loader2 } from "lucide-react";
import { AVAILABLE_TAG_COLORS } from "@/lib/tagColors"; // Supondo que seja um array de strings hexadecimais
import { cn } from "@/lib/utils";
import axios, { AxiosError } from "axios";

// Interface para a Tag, como definida na API
interface Tag {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

interface TagManagerProps {
  projectId: string;
}

const TagManager: React.FC<TagManagerProps> = ({ projectId }) => {
  const [newTagName, setNewTagName] = useState("");
  // Assumindo que AVAILABLE_TAG_COLORS é um array de strings (códigos hex)
  const [newTagColor, setNewTagColor] = useState(AVAILABLE_TAG_COLORS[0]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- HOOKS DE DADOS (React Query) ---

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ["tags", projectId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/tags?projectId=${projectId}`);
      return data;
    },
    enabled: !!projectId,
  });

  const handleMutationError = (error: Error | AxiosError) => {
    let message = "Ocorreu um erro inesperado.";
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }
    toast({ title: "Erro", description: message, variant: "destructive" });
  };

  const createTagMutation = useMutation({
    mutationFn: (tagData: { name: string; color: string; projectId: string }) =>
      axios.post("/api/tags", tagData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", projectId] });
      setNewTagName("");
      setNewTagColor(AVAILABLE_TAG_COLORS[0]);
      toast({ title: "Tag criada com sucesso!" });
    },
    onError: handleMutationError,
  });

  const updateTagMutation = useMutation({
    mutationFn: (tagData: { id: string; name?: string; color?: string }) =>
      axios.put("/api/tags", tagData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", projectId] });
      setEditingTag(null);
      toast({ title: "Tag atualizada com sucesso!" });
    },
    onError: handleMutationError,
  });

  const deleteTagMutation = useMutation({
    mutationFn: (tagId: string) =>
      axios.delete("/api/tags", { data: { id: tagId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", projectId] });
      toast({ title: "Tag excluída com sucesso!" });
    },
    onError: handleMutationError,
  });

  // --- HANDLERS DE EVENTOS ---

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast({ title: "Nome da tag é obrigatório", variant: "destructive" });
      return;
    }
    createTagMutation.mutate({
      name: newTagName.trim(),
      color: newTagColor,
      projectId,
    });
  };

  const handleUpdateTag = () => {
    if (!editingTag || !editingTag.name.trim()) {
      toast({ title: "Nome da tag é obrigatório", variant: "destructive" });
      return;
    }
    updateTagMutation.mutate({
      id: editingTag.id,
      name: editingTag.name.trim(),
      color: editingTag.color,
    });
  };

  // --- COMPONENTES DE UI INTERNOS ---

  const ColorPicker = ({
    selectedColor,
    onColorChange,
    disabled = false,
  }: {
    selectedColor: string;
    onColorChange: (color: string) => void;
    disabled?: boolean;
  }) => (
    <div className="flex flex-wrap gap-2 pt-2">
      {AVAILABLE_TAG_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          disabled={disabled}
          className={cn(
            "w-6 h-6 rounded-full border-2 transition-transform duration-150",
            selectedColor === color
              ? "border-primary scale-110"
              : "border-transparent",
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:scale-110"
          )}
          style={{ backgroundColor: color }}
          onClick={() => !disabled && onColorChange(color)}
          aria-label={`Selecionar cor ${color}`}
        />
      ))}
    </div>
  );

  if (isLoading) return <div className="p-4">Carregando tags...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Criar nova tag */}
        <div className="space-y-2 p-4 border rounded-lg">
          <Label htmlFor="new-tag-name" className="font-semibold">
            Criar Nova Tag
          </Label>
          <Input
            id="new-tag-name"
            placeholder="Nome da tag"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            disabled={createTagMutation.isPending}
          />
          <div>
            <Label className="text-sm font-medium">Cor</Label>
            <ColorPicker
              selectedColor={newTagColor}
              onColorChange={setNewTagColor}
              disabled={createTagMutation.isPending}
            />
          </div>
          <Button
            onClick={handleCreateTag}
            disabled={createTagMutation.isPending}
          >
            {createTagMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Criar Tag
          </Button>
        </div>

        {/* Lista de tags existentes */}
        <div className="space-y-2">
          <Label className="font-semibold">Tags Existentes</Label>
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-2">
              Nenhuma tag encontrada para este projeto.
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  {editingTag?.id === tag.id ? (
                    // --- MODO DE EDIÇÃO ---
                    <div className="flex-1 space-y-3">
                      <Input
                        value={editingTag.name}
                        onChange={(e) =>
                          setEditingTag({ ...editingTag, name: e.target.value })
                        }
                        disabled={updateTagMutation.isPending}
                      />
                      <ColorPicker
                        selectedColor={editingTag.color}
                        onColorChange={(color) =>
                          setEditingTag({ ...editingTag, color })
                        }
                        disabled={
                          tag.name === "Prioridade" ||
                          updateTagMutation.isPending
                        }
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdateTag}
                          disabled={updateTagMutation.isPending}
                        >
                          {updateTagMutation.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTag(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // --- MODO DE VISUALIZAÇÃO ---
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium">{tag.name}</span>
                        {tag.name === "Prioridade" && (
                          <span className="text-xs text-muted-foreground">
                            (Obrigatória)
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingTag(tag)}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {tag.name !== "Prioridade" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteTagMutation.mutate(tag.id)}
                            disabled={
                              deleteTagMutation.isPending &&
                              deleteTagMutation.variables === tag.id
                            }
                            title="Excluir"
                          >
                            {deleteTagMutation.isPending &&
                            deleteTagMutation.variables === tag.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TagManager;
