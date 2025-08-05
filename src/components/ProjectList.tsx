"use client";

import { FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@prisma/client";
import { useToast } from "./ui/use-toast";
import { Skeleton } from "./ui/skeleton";
import ProjectForm from "./ProjectForm";
import ProjectEditForm from "./ProjectEditForm";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useSession } from 'next-auth/react';

const fetchProjects = async (): Promise<Project[]> => {
  const response = await fetch("/api/projects");
  if (!response.ok) {
    throw new Error("Falha ao buscar áreas");
  }
  return response.json();
};

interface ProjectListProps {
  className?: string;
}

const ProjectList: FC<ProjectListProps> = ({ className }) => {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const currentProjectId = searchParams.get("projectId") || "all";

  const { data: projects, isLoading, error, refetch } = useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    onError: (err) => {
      toast({
        title: "Erro ao Carregar áreas",
        description: err.message || "Não foi possível carregar a lista de áreas.",
        variant: "destructive",
      });
    },
  });

  const handleSelectProject = (projectId: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    
    if (projectId === "all") {
      params.delete("projectId");
    } else {
      params.set("projectId", projectId);
    }
    
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projetos</h2>
        {session?.user?.role === 'ADMIN' && (
          <ProjectForm
            onSuccess={refetch}
            trigger={
              <Button size="sm" className="h-8 flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Novo</span>
              </Button>
            }
          />
        )}
      </div>
      
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <div className="p-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
          Erro ao carregar projetos. Tente novamente.
        </div>
      ) : (
        <div className="space-y-1">
          <div 
            className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
              currentProjectId === "all" ? "bg-gray-100 dark:bg-gray-800" : ""
            }`}
            onClick={() => handleSelectProject("all")}
          >
            <span className="font-medium">Todas as áreas</span>
          </div>
          
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <div 
                key={project.id}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  currentProjectId === project.id ? "bg-gray-100 dark:bg-gray-800" : ""
                }`}
                onClick={() => handleSelectProject(project.id)}
              >
                <div className="flex-1 truncate" title={project.description || ""}>
                  <div className="font-medium">{project.name}</div>
                  {project.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {project.description}
                    </div>
                  )}
                </div>
                {session?.user?.role === 'ADMIN' && (
                  <ProjectEditForm project={project} onSuccess={refetch} />
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-md text-center">
              Nenhum projeto encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectList;

