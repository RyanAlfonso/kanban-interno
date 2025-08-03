"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { CalendarIcon, Filter, X, Tag, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface Project {
  id: string;
  name: string;
}

const AdvancedFilters = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Estados dos filtros
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedProject, setSelectedProject] = useState<string>("");

  // Buscar projetos
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  // Buscar tags do projeto selecionado
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["tags", selectedProject],
    queryFn: async () => {
      if (!selectedProject) return [];
      const response = await fetch(`/api/tags?projectId=${selectedProject}`);
      if (!response.ok) throw new Error("Failed to fetch tags");
      return response.json();
    },
    enabled: !!selectedProject,
  });

  // Buscar usuários
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Carregar filtros dos parâmetros da URL
  useEffect(() => {
    const projectId = searchParams.get("projectId");
    const tagIds = searchParams.get("tagIds")?.split(",").filter(Boolean) || [];
    const assignedToIds = searchParams.get("assignedToIds")?.split(",").filter(Boolean) || [];
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (projectId) setSelectedProject(projectId);
    setSelectedTags(tagIds);
    setSelectedUsers(assignedToIds);
    if (startDateParam) setStartDate(new Date(startDateParam));
    if (endDateParam) setEndDate(new Date(endDateParam));
  }, [searchParams]);

  // Aplicar filtros
  const applyFilters = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    
    // Manter parâmetros existentes como 'q' (busca)
    if (selectedProject) {
      params.set("projectId", selectedProject);
    } else {
      params.delete("projectId");
    }

    if (selectedTags.length > 0) {
      params.set("tagIds", selectedTags.join(","));
    } else {
      params.delete("tagIds");
    }

    if (selectedUsers.length > 0) {
      params.set("assignedToIds", selectedUsers.join(","));
    } else {
      params.delete("assignedToIds");
    }

    if (startDate) {
      params.set("startDate", format(startDate, "yyyy-MM-dd"));
    } else {
      params.delete("startDate");
    }

    if (endDate) {
      params.set("endDate", format(endDate, "yyyy-MM-dd"));
    } else {
      params.delete("endDate");
    }

    router.replace(`/?${params.toString()}`);
    setIsOpen(false);
  };

  // Limpar filtros
  const clearFilters = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    
    // Remover apenas os parâmetros de filtro, manter outros como 'q'
    params.delete("projectId");
    params.delete("tagIds");
    params.delete("assignedToIds");
    params.delete("startDate");
    params.delete("endDate");

    setSelectedProject("");
    setSelectedTags([]);
    setSelectedUsers([]);
    setStartDate(undefined);
    setEndDate(undefined);

    router.replace(`/?${params.toString()}`);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = selectedProject || selectedTags.length > 0 || selectedUsers.length > 0 || startDate || endDate;

  // Contar filtros ativos
  const activeFiltersCount = [
    selectedProject,
    selectedTags.length > 0,
    selectedUsers.length > 0,
    startDate,
    endDate
  ].filter(Boolean).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "relative",
            hasActiveFilters && "border-blue-500 bg-blue-50 dark:bg-blue-950"
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-blue-500 text-white"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros Avançados</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 text-xs"
              >
                Limpar
              </Button>
            )}
          </div>

          {/* Filtro por Projeto */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Projeto
            </Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os projetos</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Tags */}
          {selectedProject && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                Tags
              </Label>
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`tag-${tag.id}`}
                      checked={selectedTags.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag.id]);
                        } else {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label
                      htmlFor={`tag-${tag.id}`}
                      className="flex items-center space-x-2 text-sm cursor-pointer"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </label>
                  </div>
                ))}
                {tags.length === 0 && (
                  <p className="text-sm text-gray-500">Nenhuma tag encontrada</p>
                )}
              </div>
            </div>
          )}

          {/* Filtro por Responsáveis */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Responsáveis
            </Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`user-${user.id}`}
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user.id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor={`user-${user.id}`}
                    className="flex items-center space-x-2 text-sm cursor-pointer"
                  >
                    {user.image && (
                      <img
                        src={user.image}
                        alt={user.name || user.email}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <span>{user.name || user.email}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Filtro por Período */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Período (Deadline)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-500">Data inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Data final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex space-x-2 pt-2">
            <Button onClick={applyFilters} className="flex-1">
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdvancedFilters;
