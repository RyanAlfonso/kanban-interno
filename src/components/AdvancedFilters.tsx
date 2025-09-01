"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios"; // Adicionado para chamadas de API
import { format } from "date-fns";
import {
  Briefcase,
  CalendarIcon,
  Clock,
  Filter,
  Tag as TagIcon,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// REMOVIDO: import { getAllTagsWithColors } from "@/lib/tags";

// --- Interfaces ---
interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

// NOVA INTERFACE: Define a estrutura de uma tag, conforme a API
interface Tag {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

// --- Função de Busca de Dados (Data Fetching) ---
const fetchTagsByProjectId = async (projectId: string): Promise<Tag[]> => {
  if (!projectId) {
    return []; // Retorna array vazio se nenhum projeto for selecionado
  }
  const { data } = await axios.get<Tag[]>(`/api/projects/tags?projectId=${projectId}`);
  return data;
};


const AdvancedFilters = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { register } = useForm();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch(process.env.NEXT_PUBLIC_BASE_PATH + "/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch(process.env.NEXT_PUBLIC_BASE_PATH + "/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // --- NOVA LÓGICA: Busca de tags via API com useQuery ---
  const { data: allTags = [], isLoading: isLoadingTags } = useQuery<Tag[]>({
    queryKey: ['tags', selectedProject],
    queryFn: () => fetchTagsByProjectId(selectedProject),
    enabled: !!selectedProject, // A busca só é ativada se um projeto for selecionado
  });

  // REMOVIDO: const allTags = getAllTagsWithColors();

  useEffect(() => {
    const projectId = searchParams.get("projectId") || "";
    const assignedToIds =
      searchParams.get("assignedToIds")?.split(",").filter(Boolean) || [];
    const tagsParam =
      searchParams.get("tags")?.split(",").filter(Boolean) || [];
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    setSelectedProject(projectId);
    setSelectedUsers(assignedToIds);
    setSelectedTags(tagsParam);
    if (startDateParam) setStartDate(new Date(startDateParam));
    if (endDateParam) setEndDate(new Date(endDateParam));
  }, [searchParams]);

  // NOVO useEffect: Limpa as tags selecionadas se o projeto mudar
  useEffect(() => {
    setSelectedTags([]);
  }, [selectedProject]);

  const applyFilters = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    const setOrDeleteParam = (key: string, value: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };

    setOrDeleteParam("projectId", selectedProject);
    setOrDeleteParam("assignedToIds", selectedUsers.join(","));
    setOrDeleteParam("tags", selectedTags.join(","));
    setOrDeleteParam(
      "startDate",
      startDate ? format(startDate, "yyyy-MM-dd") : ""
    );
    setOrDeleteParam("endDate", endDate ? format(endDate, "yyyy-MM-dd") : "");

    router.replace(`/?${params.toString()}`);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("projectId");
    params.delete("assignedToIds");
    params.delete("tags");
    params.delete("startDate");
    params.delete("endDate");

    setSelectedProject("");
    setSelectedUsers([]);
    setSelectedTags([]);
    setStartDate(undefined);
    setEndDate(undefined);

    router.replace(`/?${params.toString()}`);
    setIsOpen(false);
  };

  const activeFiltersCount = [
    selectedProject,
    selectedTags.length > 0,
    selectedUsers.length > 0,
    startDate,
    endDate,
  ].filter(Boolean).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "relative",
            activeFiltersCount > 0 &&
              "border-blue-500 bg-blue-50 dark:bg-blue-950"
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
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 text-xs"
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center">
              <Briefcase className="h-4 w-4 mr-2" />
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

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center">
              <TagIcon className="h-4 w-4 mr-2" />
              Tags
            </Label>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
              {/* --- Lógica de renderização das tags atualizada --- */}
              {isLoadingTags && <p className="text-xs text-gray-500">Carregando tags...</p>}
              {!isLoadingTags && !selectedProject && <p className="text-xs text-gray-500">Selecione um projeto para ver as tags.</p>}
              {!isLoadingTags && selectedProject && allTags.length === 0 && <p className="text-xs text-gray-500">Nenhuma tag encontrada.</p>}
              {allTags.map((tag) => (
                <div key={tag.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`tag-${tag.id}`}
                    // ATUALIZADO: usa tag.id para o estado
                    checked={selectedTags.includes(tag.id)}
                    onChange={(e) =>
                      setSelectedTags(
                        e.target.checked
                          ? [...selectedTags, tag.id]
                          : selectedTags.filter((id) => id !== tag.id)
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor={`tag-${tag.id}`}
                    className="flex items-center space-x-2 text-sm cursor-pointer"
                  >
                    {/* ATUALIZADO: usa tag.color diretamente */}
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-medium">{tag.name}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* O restante do seu código permanece o mesmo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Responsáveis
            </Label>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`user-${user.id}`}
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => {
                      setSelectedUsers(
                        e.target.checked
                          ? [...selectedUsers, user.id]
                          : selectedUsers.filter((id) => id !== user.id)
                      );
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor={`user-${user.id}`}
                    className="flex items-center space-x-2 text-sm cursor-pointer"
                  >
                    {user.image && (
                      <img
                        src={user.image}
                        alt={user.name || user.email}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span>{user.name || user.email}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

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
                      {startDate ? format(startDate, "dd/MM/yy") : "De"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      {...register("startDate")}
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
                      {endDate ? format(endDate, "dd/MM/yy") : "Até"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      {...register("endDate")}
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
