"use client";

import { FC, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Project } from "@prisma/client";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { ChevronDown, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
// Update import from react-query to @tanstack/react-query
import { useQuery, useQueryClient } from "@tanstack/react-query"; 
import { useToast } from "./ui/use-toast";
import { Skeleton } from "./ui/skeleton"; // Import Skeleton

// Função para buscar projetos da API
const fetchProjects = async (): Promise<Project[]> => {
  console.log("Fetching projects for selector...");
  const response = await fetch("/api/projects");
  if (!response.ok) {
    console.error("Failed to fetch projects for selector, status:", response.status);
    throw new Error("Falha ao buscar projetos");
  }
  const data = await response.json();
  console.log("Projects fetched for selector:", data);
  return data;
};

interface ProjectSelectorProps {
  // Removed onCreateProject as it's handled in AppSideBar now
}

const ProjectSelector: FC<ProjectSelectorProps> = () => {
  console.log("Rendering ProjectSelector...");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient(); // Get query client instance

  // Update useQuery syntax for v4+
  const { data: projects, isLoading, error } = useQuery<Project[], Error>({
    queryKey: ["projects"], // Query key as array
    queryFn: fetchProjects, // Fetch function
    onError: (err) => {
      console.error("Error fetching projects in ProjectSelector:", err);
      toast({
        title: "Erro ao Carregar Projetos",
        description: err.message || "Não foi possível carregar a lista de projetos.",
        variant: "destructive",
      });
    },
  });

  // Obter o projectId atual da URL
  const currentProjectId = searchParams.get("projectId") || "all"; // Default to "all"
  console.log("ProjectSelector - Current Project ID:", currentProjectId);

  // Encontrar o Nome da área atual
  const currentProjectName = 
      isLoading ? "Carregando..." 
    : currentProjectId === "all" ? "Todas as áreas" 
    : projects?.find(p => p.id === currentProjectId)?.name || "Projeto não encontrado"; // Handle case where project might not be found

  // Função para mudar o projeto selecionado
  const handleProjectChange = (projectId: string) => {
    console.log("ProjectSelector - Handling project change:", projectId);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    
    if (projectId === "all") {
      params.delete("projectId");
    } else {
      params.set("projectId", projectId);
    }
    
    // Navigate to the root page with updated params
    router.push(`/?${params.toString()}`);
    setOpen(false); // Close popover
  };

  // Callback function for successful project creation (called from AppSideBar)
  // This component doesn't create projects directly anymore, but might need to react
  // useEffect(() => {
  //   // Optional: Could listen for project creation events if needed
  // }, []);

  try {
    return (
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="project-selector" className="text-sm font-medium">
          Projeto Atual
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between text-sm font-normal h-9 px-3 py-2"
              disabled={isLoading} // Disable while loading
            >
              <span className="truncate" title={currentProjectName}>
                {currentProjectName}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[--radix-popover-trigger-width] p-0 bg-white dark:bg-gray-900 shadow-lg rounded-md border border-gray-200 dark:border-gray-800 z-50"
            align="start"
          >
            {/* Loading state inside popover */}
            {isLoading && (
              <div className="p-2">
                <Skeleton className="h-8 w-full mb-1" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}
            {/* Error state inside popover */}
            {error && !isLoading && (
              <div className="p-2 text-sm text-red-500">Erro ao carregar.</div>
            )}
            {/* Project list */}
            {!isLoading && !error && (
              <div className="max-h-60 overflow-auto p-1">
                {/* "All Projects" Option */}
                <Button
                  variant={currentProjectId === "all" ? "secondary" : "ghost"} // Use secondary for selected
                  className="w-full justify-start font-normal h-8 px-2 text-sm"
                  onClick={() => handleProjectChange("all")}
                >
                  Todas as áreas
                </Button>
                
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
        
        {/* Create project button is now in AppSideBar */}
      </div>
    );
  } catch (renderError) {
      console.error("Error rendering ProjectSelector:", renderError);
      return <div className="text-red-500">Erro ao renderizar seletor de projetos.</div>;
  }
};

export default ProjectSelector;

