"use client";

import { FC, useState } from "react";
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
import { X } from "lucide-react";

interface ProjectFormProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const ProjectForm: FC<ProjectFormProps> = ({ onSuccess, trigger }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description }),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao criar área");
      }
      
      toast({
        title: "Sucesso",
        description: "Projeto criado com sucesso",
      });
      
      // Limpar formulário
      setName("");
      setDescription("");
      
      // Fechar diálogo
      setOpen(false);
      
      // Callback de sucesso (para atualizar lista de projetos)
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o projeto",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Novo Projeto</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <span>Criar Novo Projeto</span>
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full mt-2" 
            disabled={isLoading}
          >
            {isLoading ? "Criando..." : "Criar Projeto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectForm;
