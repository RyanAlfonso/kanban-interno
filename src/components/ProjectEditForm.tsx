"use client";

import { FC, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "./ui/dialog";
import { X, Pencil, Trash2 } from "lucide-react";
import { Project } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";

interface ProjectEditFormProps {
  project: Project;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const ProjectEditForm: FC<ProjectEditFormProps> = ({ project, onSuccess, trigger }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Atualizar os campos quando o projeto mudar
  useEffect(() => {
    setName(project.name);
    setDescription(project.description || "");
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Erro",
        description: "O Nome da área é obrigatório",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/projects", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          id: project.id,
          name, 
          description 
        }),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao atualizar projeto");
      }
      
      toast({
        title: "Sucesso",
        description: "Projeto atualizado com sucesso",
      });
      
      // Fechar diálogo
      setOpen(false);
      
      // Invalidar cache de projetos para forçar recarregamento
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      
      // Callback de sucesso
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o projeto",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir o projeto "${project.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch("/api/projects", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: project.id }),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao excluir projeto");
      }
      
      toast({
        title: "Sucesso",
        description: "Projeto excluído com sucesso",
      });
      
      // Fechar diálogo
      setOpen(false);
      
      // Invalidar cache de projetos para forçar recarregamento
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      
      // Callback de sucesso
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o projeto",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between">
            <span>Editar Projeto</span>
            <DialogClose asChild>
              <Button variant="ghost" className="p-0 h-auto">
                <X />
              </Button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Nome da área</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o Nome da área"
              disabled={isLoading || isDeleting}
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="project-description">Descrição (opcional)</Label>
            <Input
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite uma descrição para o projeto"
              disabled={isLoading || isDeleting}
            />
          </div>
          
          <div className="flex justify-between gap-2 mt-2">
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading || isDeleting}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
            
            <Button 
              type="submit" 
              disabled={isLoading || isDeleting}
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectEditForm;

