"use client";

import { FC, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Project } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "../ui/use-toast";

// Função para buscar projetos da API
const fetchProjects = async (): Promise<Project[]> => {
  const response = await fetch("/api/projects");
  if (!response.ok) {
    throw new Error("Falha ao buscar projetos");
  }
  return response.json();
};

interface DashboardProjectSelectorProps {
  className?: string;
}

const DashboardProjectSelector: FC<DashboardProjectSelectorProps> = ({ className }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Buscar projetos
  const { data: projects, isLoading, error } = useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    onError: (err) => {
      toast({
        title: "Erro ao Carregar Projetos",
        description: err.message || "Não foi possível carregar a lista de projetos.",
        variant: "destructive",
      });
    },
  });

  // Obter o projectId atual da URL
  const currentProjectId = searchParams.get("projectId") || "all";

  // Encontrar o Nome da área atual
  const currentProjectName = 
      isLoading ? "Carregando..." 
    : currentProjectId === "all" ? "Todas as áreas" 
    : projects?.find(p => p.id === currentProjectId)?.name || "Projeto não encontrado";

  // Função para mudar o projeto selecionado
  const handleProjectChange = (projectId: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    
    if (projectId === "all") {
      params.delete("projectId");
    } else {
      params.set("projectId", projectId);
    }
    
    // Navegar para a página de dashboard com os parâmetros atualizados
    router.push(`/dashboard?${params.toString()}`);
    setOpen(false);
  };

  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      <Label htmlFor="dashboard-project-selector" className="text-sm font-medium">
        Projeto para Relatório
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-sm font-normal"
            disabled={isLoading}
          >
            <span className="truncate" title={currentProjectName}>
              {currentProjectName}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
        >
          {/* Loading state */}
          {isLoading && (
            <div className="p-2">
              <Skeleton className="h-8 w-full mb-1" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}
          
          {/* Error state */}
          {error && !isLoading && (
            <div className="p-2 text-sm text-red-500">Erro ao carregar projetos.</div>
          )}
          
          {/* Project list */}
          {!isLoading && !error && (
            <div className="max-h-60 overflow-auto p-1">
              {/* "All Projects" Option */}
              {projects && projects.length > 0 && (
                <Button
                  variant={currentProjectId === "all" ? "secondary" : "ghost"}
                  className="w-full justify-start font-normal h-8 px-2 text-sm"
                  onClick={() => handleProjectChange("all")}
                >
                  Todas as áreas
                </Button>
              )}
              
              {/* Individual Projects */}
              {projects?.map((project) => (
                <Button
                  key={project.id}
                  variant={currentProjectId === project.id ? "secondary" : "ghost"}
                  className="w-full justify-start font-normal h-8 px-2 text-sm"
                  onClick={() => handleProjectChange(project.id)}
                >
                  <span className="truncate" title={project.name}>{project.name}</span>
                </Button>
              ))}
              
              {projects?.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">Nenhum projeto encontrado.</div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DashboardProjectSelector;

