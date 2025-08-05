"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarIcon,
  Filter,
  Users,
  Clock,
  Tag as TagIcon,
  Briefcase,
} from "lucide-react";

// Importações dos componentes de UI (shadcn/ui)
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { cn } from "@/lib/utils";

// ================== DEFINIÇÕES DE TIPO ==================
// Adicionar estas interfaces garante a segurança de tipos e melhora o autocompletar.
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

// Deixando a interface Tag preparada para quando você for implementá-la.
interface Tag {
  id: string;
  name: string;
  color?: string;
}
// ========================================================

const AdvancedFilters = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados para controlar os valores selecionados nos filtros
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // Preparado para o futuro
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // --- BUSCA DE DADOS COM REACT-QUERY ---

  // Buscar todos os projetos para o seletor
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  // Buscar todos os usuários para o filtro de responsáveis
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });
  
  // (A query para Tags foi mantida, mas não será usada até você reativar a UI)

  // --- EFEITOS PARA SINCRONIZAÇÃO ---

  // Carrega o estado inicial dos filtros a partir dos parâmetros da URL
  useEffect(() => {
    const projectId = searchParams.get("projectId") || "";
    const assignedToIds =
      searchParams.get("assignedToIds")?.split(",").filter(Boolean) || [];
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    setSelectedProject(projectId);
    setSelectedUsers(assignedToIds);
    if (startDateParam) setStartDate(new Date(startDateParam));
    if (endDateParam) setEndDate(new Date(endDateParam));
  }, [searchParams]);

  // --- FUNÇÕES DE MANIPULAÇÃO DOS FILTROS ---

  // Aplica os filtros, atualizando a URL
  const applyFilters = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));

    // Função auxiliar para definir ou remover um parâmetro
    const setOrDeleteParam = (key: string, value: string) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    };

    setOrDeleteParam("projectId", selectedProject);
    setOrDeleteParam("assignedToIds", selectedUsers.join(","));
    setOrDeleteParam(
      "startDate",
      startDate ? format(startDate, "yyyy-MM-dd") : ""
    );
    setOrDeleteParam("endDate", endDate ? format(endDate, "yyyy-MM-dd") : "");
    // (A lógica para 'tagIds' será adicionada aqui no futuro)

    router.replace(`/?${params.toString()}`);
    setIsOpen(false); // Fecha o popover após aplicar
  };

  // Limpa todos os filtros e atualiza a URL
  const clearFilters = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("projectId");
    params.delete("assignedToIds");
    params.delete("startDate");
    params.delete("endDate");
    // (params.delete("tagIds") no futuro)

    setSelectedProject("");
    setSelectedUsers([]);
    setStartDate(undefined);
    setEndDate(undefined);

    router.replace(`/?${params.toString()}`);
    setIsOpen(false);
  };

  // Calcula a quantidade de filtros ativos para exibir no badge
  const activeFiltersCount = [
    selectedProject,
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

          {/* Filtro por Projeto */}
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

          {/* Filtro por Responsáveis */}
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

          {/* Filtro por Período (Deadline) */}
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
