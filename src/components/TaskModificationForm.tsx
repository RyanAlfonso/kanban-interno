"use client";

import useBreakpoint from "@/hooks/useBreakpoint";
import { TASK_STATE_OPTIONS } from "@/lib/const";
import { PREDEFINED_TAGS } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { Project, Todo } from "@prisma/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import { CalendarIcon, X } from "lucide-react";
import { FC, lazy, useEffect, useState, Fragment } from "react"; // Added useEffect, useState, Fragment
import { Controller, UseFormReturn } from "react-hook-form";
import { UseMutationResult, useQuery } from "@tanstack/react-query"; 
import "react-quill/dist/quill.snow.css";
import { PopulatedTodoHistoryEntry } from "@/types/history"; // Added import for history type
import CustomizedMultSelect from "./CustomizedMultSelect";
import CustomizedSelect from "./CustomizedSelect";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/use-toast";


type TaskEditFormProps = {
  handleOnClose: () => void;
  task: Partial<Todo>;
  title: string;
  enableDelete?: boolean;
  deleteMutationFunctionReturn?: UseMutationResult<Todo[], AxiosError, { id: string }, any>;
  editMutationFunctionReturn: UseMutationResult<Todo | Todo[], AxiosError, any, any>;
  formFunctionReturn: UseFormReturn<any>;
};

const CustomizedReactQuill = lazy(() => import("./CustomizedReactQuill"));

type ErrorMessageProps = {
  msg?: string;
};

const TaskModificationForm: FC<TaskEditFormProps> = ({
  handleOnClose,
  task,
  title,
  enableDelete,
  deleteMutationFunctionReturn,
  editMutationFunctionReturn,
  formFunctionReturn,
}) => {
  console.log("Rendering TaskModificationForm (Corrected)..."); 
  const { md } = useBreakpoint();
  useToast();
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
  } = formFunctionReturn;
  
  const { mutate: submitEditTodoTask, isPending: isEditLoading } = editMutationFunctionReturn;
  const { mutate: deleteFunc, isPending: isDeleteLoading } = 
    deleteMutationFunctionReturn ?? { mutate: () => {}, isPending: false };

  const [historyEntries, setHistoryEntries] = useState<PopulatedTodoHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (task.id && title === "Edit Task") { // Only fetch if task.id exists and it's an edit form
      setHistoryLoading(true);
      setHistoryError(null);
      fetch(`/api/todo/${task.id}/history`)
        .then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Failed to fetch history: ${res.status}`);
          }
          return res.json();
        })
        .then((data: PopulatedTodoHistoryEntry[]) => {
          setHistoryEntries(data);
        })
        .catch((err) => {
          console.error("Error fetching task history:", err);
          setHistoryError(err.message || "An unknown error occurred while fetching history.");
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    }
  }, [task.id, title]);


  const tagOptions = [...PREDEFINED_TAGS];


  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/projects");
        if (!response.ok) {
          throw new Error("Falha ao buscar áreas");
        }
        return response.json();
      } catch (err) {
        console.error("Error fetching projects in TaskModificationForm:", err);
        throw err;
      }
    }
  });

  const projectOptions = Array.isArray(projects)
    ? projects.map(project => ({
        value: project.id.toString(),
        title: project.name,
      }))
    : [];

  const ErrorMessage = ({ msg }: ErrorMessageProps) => {
    return msg ? <span className="text-red-500 text-xs">{msg}</span> : null;
  };

  const ExtraInfoField = () => {
    console.log("Rendering ExtraInfoField...");
    const isCreatingNewTaskWithColumn = title === "Create Task" && task?.columnId;

    try {
      return (
        <>
          {isCreatingNewTaskWithColumn && task.columnId && (
            <div className="relative grid gap-1 pb-4">
              <Label className="text-sm font-medium">
                Coluna
              </Label>
              <Input type="text" value={task.columnId || `(Coluna Pré-selecionada)`} readOnly className="bg-slate-100 dark:bg-slate-800"/>
            </div>
          )}

          <div className="relative grid gap-1 pb-4">
            <Label className="text-sm font-medium" htmlFor="projectId">
              Áreas
            </Label>
            <Controller
              control={control}
              name="projectId"
              defaultValue={task.projectId?.toString() || ""}
              render={({ field }) => {
                let currentValue = field.value?.toString() || "";
                if (!currentValue && !task.projectId && projectOptions.length > 0 && title === "Create Task") {
                  currentValue = projectOptions[0].value;
                }

                return (
                  <CustomizedSelect
                    options={projectOptions}
                    placeholder="Selecione a área"
                    onChange={field.onChange}
                    value={currentValue}
                  />
                );
              }}
            />
            {projectsError && <ErrorMessage msg="Erro ao carregar áreas."/>}
            {!projectsLoading && projectOptions.length === 0 && <ErrorMessage msg="Nenhuma área disponível. Crie uma área primeiro."/>}
            <ErrorMessage msg={errors.projectId?.message?.toString()} />
          </div>

          <div className="relative grid gap-1 pb-4">
            <Label className="text-sm font-medium" htmlFor="deadline">
              Prazo
            </Label>
            <Controller
              control={control}
              name="deadline"
              defaultValue={task.deadline}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "justify-start text-left font-normal w-full h-9 px-3 py-2 text-sm",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        dayjs(field.value).format("YYYY-MM-DD")
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900 z-50 border rounded-md shadow-md">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => {
                        const timestamp = date instanceof Date ? date.getTime() : null;
                        field.onChange(timestamp);
                      }}
                      initialFocus
                      register={register("deadline")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            <ErrorMessage msg={errors.deadline?.message?.toString()} />
          </div>
          <div className="relative grid gap-1 pb-4">
            <Label className="text-sm font-medium" htmlFor="tags">
              Tags
            </Label>
            <Controller
              control={control}
              name="tags"
              defaultValue={task.tags || []}
              render={({ field }) => (
                <CustomizedMultSelect
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="Selecione tags"
                  options={tagOptions}
                />
              )}
            />
            <ErrorMessage msg={errors.tags?.message?.toString()} />
          </div>
        </>
      );
    } catch(error) {
        console.error("Error rendering ExtraInfoField:", error);
        return <div>Erro ao renderizar campos extras.</div>
    }
  };

  try {
    return (
      <form
        onSubmit={handleSubmit((data) => {
          console.log("Form submitted with data:", data);
          const payload = title === "Edit Task" && task.id ? { ...data, id: task.id } : data;
          submitEditTodoTask(payload);
        })}
      >
        <Card className="sm:max-h-[80vh] overflow-y-auto border-none shadow-none">
          <CardHeader className="p-4">
            <CardTitle className="flex justify-between items-center">
              <div className="text-lg font-semibold">{title}</div>
              <Button variant="ghost" size="icon" className="p-0 h-6 w-6" onClick={handleOnClose}>
                <X className="h-4 w-4"/>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex flex-col gap-4 flex-1">
                <div className="relative grid gap-1">
                  <Label className="text-sm font-medium" htmlFor="title">
                    Título
                  </Label>
                  <Input
                    id="title"
                    className="w-full h-9 px-3 py-2 text-sm"
                    {...register("title")}
                  />
                  <ErrorMessage msg={errors.title?.message?.toString()} />
                </div>
                
                {!md && <ExtraInfoField />}
                
                <div className="relative grid gap-1 h-80">
                  <Label className="text-sm font-medium" htmlFor="description">
                    Descrição
                  </Label>
                  <Controller
                    control={control}
                    name="description"
                    defaultValue={task.description || ""}
                    render={({ field }) => (
                      <CustomizedReactQuill
                        theme="snow"
                        value={field.value || ""}
                        onChange={field.onChange}
                        className="h-[calc(100%-1.75rem)]"
                      />
                    )}
                  />
                   <ErrorMessage msg={errors.description?.message?.toString()} />
                </div>

                {/* History Section */}
                {task.id && ( // Only show history for existing tasks
                  <div className="relative grid gap-1 pt-4">
                    <Label className="text-sm font-medium">
                      Histórico de Modificações
                    </Label>
                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-slate-50 dark:bg-slate-800 text-xs">
                      {historyLoading && <p>Carregando histórico...</p>}
                      {historyError && <p className="text-red-500">Erro ao carregar histórico.</p>}
                      {!historyLoading && !historyError && historyEntries.length === 0 && (
                        <p>Nenhuma modificação registrada.</p>
                      )}
                      {!historyLoading && !historyError && historyEntries.length > 0 && (
                        <ul>
                          {historyEntries.map((entry) => (
                            <li key={entry.id} className="mb-1 p-1 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                              {entry.actionType === "MOVED" && (
                                <p>
                                  <strong>{entry.user?.name || entry.user?.email || "Usuário desconhecido"}</strong> moveu
                                  {entry.fromColumn ? ` de "${entry.fromColumn.name}"` : ""}
                                  {entry.toColumn ? ` para "${entry.toColumn.name}"` : ""}
                                  <span className="text-gray-500 dark:text-gray-400"> em {dayjs(entry.changedAt).format("DD/MM/YYYY HH:mm")}</span>
                                </p>
                              )}
                              {/* Add more conditions here for other actionTypes if needed */}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
                {/* End History Section */}

                <div className="relative flex gap-2 pt-4"> 
                  <Button type="submit" isLoading={isEditLoading}> 
                    {title === "Create Task" ? "Criar Tarefa" : "Salvar Alterações"}
                  </Button>
                  {enableDelete && deleteFunc && (
                    <Button
                      type="button" 
                      variant="outline"
                      onClick={() => task.id && deleteFunc({ id: task.id })} 
                      isLoading={isDeleteLoading}
                      disabled={!task.id || isDeleteLoading}
                    >
                      Excluir Tarefa
                    </Button>
                  )}
                </div>
              </div>
              
              {md && (
                <div className="w-full md:w-64 flex flex-col border dark:border-gray-700 rounded-lg p-4 h-min space-y-4">
                  <ExtraInfoField />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    );
  } catch (error) {
      console.error("Error rendering TaskModificationForm:", error);
      return <div>Ocorreu um erro ao renderizar o formulário.</div>
  }
};

export default TaskModificationForm;

