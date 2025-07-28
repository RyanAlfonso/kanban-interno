"use client";

import useBreakpoint from "@/hooks/useBreakpoint";
import { TASK_STATE_OPTIONS } from "@/lib/const";
import { PREDEFINED_TAGS } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { Project, Todo, User } from "@prisma/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import { CalendarIcon, X } from "lucide-react";
import { FC, lazy } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { UseMutationResult, useQuery } from "@tanstack/react-query"; 
import "react-quill/dist/quill.snow.css";
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

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<User[], Error>({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Falha ao buscar usuários");
        }
        return response.json();
      } catch (err) {
        console.error("Error fetching users in TaskModificationForm:", err);
        throw err;
      }
    }
  });

  const { data: todos, isLoading: todosLoading, error: todosError } = useQuery<Todo[], Error>({
    queryKey: ["todos"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/todo");
        if (!response.ok) {
          throw new Error("Falha ao buscar cards");
        }
        return response.json();
      } catch (err) {
        console.error("Error fetching todos in TaskModificationForm:", err);
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

  const userOptions = Array.isArray(users)
    ? users.map(user => ({
        value: user.id.toString(),
        title: user.name || user.email || "Usuário sem nome",
      }))
    : [];

  const todoOptions = Array.isArray(todos)
    ? todos.filter(todo => todo.id !== task.id) // Não incluir o próprio card
        .map(todo => ({
          value: todo.id.toString(),
          title: todo.title,
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
            <Label className="text-sm font-medium" htmlFor="assignedToIds">
              Usuários Responsáveis *
            </Label>
            <Controller
              control={control}
              name="assignedToIds"
              defaultValue={task.assignedToIds || []}
              render={({ field }) => (
                <CustomizedMultSelect
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="Selecione usuários responsáveis"
                  options={userOptions.map(user => user.title)}
                />
              )}
            />
            {usersError && <ErrorMessage msg="Erro ao carregar usuários."/>}
            {!usersLoading && userOptions.length === 0 && <ErrorMessage msg="Nenhum usuário disponível."/>}
            <ErrorMessage msg={errors.assignedToIds?.message?.toString()} />
          </div>

          <div className="relative grid gap-1 pb-4">
            <Label className="text-sm font-medium" htmlFor="parentId">
              Card Pai (Hierárquico)
            </Label>
            <Controller
              control={control}
              name="parentId"
              defaultValue={task.parentId || ""}
              render={({ field }) => (
                <CustomizedSelect
                  options={[{ value: "", title: "Nenhum" }, ...todoOptions]}
                  placeholder="Selecione um card pai"
                  onChange={field.onChange}
                  value={field.value || ""}
                />
              )}
            />
            {todosError && <ErrorMessage msg="Erro ao carregar cards."/>}
            <ErrorMessage msg={errors.parentId?.message?.toString()} />
          </div>

          <div className="relative grid gap-1 pb-4">
            <Label className="text-sm font-medium" htmlFor="linkedCardIds">
              Cards Relacionados (Irmãos)
            </Label>
            <Controller
              control={control}
              name="linkedCardIds"
              defaultValue={task.linkedCardIds || []}
              render={({ field }) => (
                <CustomizedMultSelect
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="Selecione cards relacionados"
                  options={todoOptions.map(todo => todo.title)}
                />
              )}
            />
            {todosError && <ErrorMessage msg="Erro ao carregar cards."/>}
            <ErrorMessage msg={errors.linkedCardIds?.message?.toString()} />
          </div>

          <div className="relative grid gap-1 pb-4">
            <Label className="text-sm font-medium" htmlFor="deadline">
              Prazo *
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
                        const isoString = date instanceof Date ? date.toISOString() : "";
                        field.onChange(isoString);
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
