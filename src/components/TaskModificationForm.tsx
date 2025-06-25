"use client";

import useBreakpoint from "@/hooks/useBreakpoint";
import { TASK_STATE_OPTIONS } from "@/lib/const";
import { cn } from "@/lib/utils";
import todoLabelFetchRequest from "@/requests/todoLabelFetchRequest";
import { Project, Todo } from "@prisma/client";
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
// Ensure this import uses @tanstack/react-query
import { UseMutationResult, useQuery } from "@tanstack/react-query"; 
import "react-quill/dist/quill.snow.css";
import CustomizedMultSelect from "./CustomizedMultSelect";
import CustomizedSelect from "./CustomizedSelect";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label as ShadcnLabel } from "./ui/label"; // Renamed to avoid conflict
import { useToast } from "./ui/use-toast";

// Define Label type to match assumed structure
interface Label {
  id: string;
  name: string;
  color: string;
}

type TaskEditFormProps = {
  handleOnClose: () => void;
  task: Partial<Todo>; // Can be partial for creation form defaults
  title: string;
  enableDelete?: boolean;
  // Ensure UseMutationResult type matches @tanstack/react-query v4+
  deleteMutationFunctionReturn?: UseMutationResult<Todo[], AxiosError, { id: string }, any>; // Specify variable type for delete
  editMutationFunctionReturn: UseMutationResult<Todo | Todo[], AxiosError, any, any>; // Allow Todo or Todo[] based on mutation
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
  const { axiosToast } = useToast();
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
  } = formFunctionReturn;
  
  // Destructure mutation functions and loading states (use isPending for v4+)
  const { mutate: submitEditTodoTask, isPending: isEditLoading } = editMutationFunctionReturn;
  const { mutate: deleteFunc, isPending: isDeleteLoading } = 
    deleteMutationFunctionReturn ?? { mutate: () => {}, isPending: false };

  // Ensure useQuery uses v4+ syntax for fetching labels
  // Assuming todoLabelFetchRequest will return Label[] { id, name, color }
  const { data: fetchedLabels, isLoading: labelsLoading, error: labelsError } = useQuery<Label[], Error>({
    queryKey: ["labels"],
    queryFn: todoLabelFetchRequest as () => Promise<Label[]>, // Cast if request is string[]
    onError: (err) => {
        console.error("Error fetching labels in TaskModificationForm:", err);
    }
  });

  // Transform fetchedLabels (Label[]) into string[] for CustomizedMultSelect options
  const labelOptionsForSelect: string[] = fetchedLabels ? fetchedLabels.map(label => label.name) : [];

  // Buscar projetos para o seletor
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        throw new Error("Falha ao buscar projetos");
      }
      return response.json();
    },
    onError: (err) => {
      console.error("Error fetching projects in TaskModificationForm:", err);
    }
  });

  // Converter projetos para o formato de opções do select
  const projectOptions = projects?.map(project => ({
    value: project.id.toString(), // Ensure value is a string
    title: project.name,
  })) || [];

  const ErrorMessage = ({ msg }: ErrorMessageProps) => {
    return msg ? <span className="text-red-500 text-xs">{msg}</span> : null;
  };

  const ExtraInfoField = () => {
    console.log("Rendering ExtraInfoField...");
    try {
      return (
        <>
          <div className="relative grid gap-1 pb-4">
            <ShadcnLabel className="text-sm font-medium" htmlFor="state">
              Estado
            </ShadcnLabel>
            <Controller
              control={control}
              name="state"
              defaultValue={task.state} // Use defaultValue from task prop
              render={({ field }) => (
                <CustomizedSelect
                  options={TASK_STATE_OPTIONS}
                  placeholder="Selecione o estado"
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
            <ErrorMessage msg={errors.state?.message?.toString()} />
          </div>

          <div className="relative grid gap-1 pb-4">
            <ShadcnLabel className="text-sm font-medium" htmlFor="projectId">
              Projeto
            </ShadcnLabel>
            <Controller
              control={control}
              name="projectId"
              defaultValue={task.projectId?.toString() || ""} // Use defaultValue from task prop, ensure string
              render={({ field }) => (
                <CustomizedSelect
                  options={projectOptions} // Remove "Sem projeto" option
                  placeholder="Selecione um projeto" // Changed placeholder
                  onChange={field.onChange}
                  value={field.value?.toString() || ""}
                  isLoading={projectsLoading}
                  // Disable if loading and no projects, or if there's an error,
                  // but allow interaction if there are projects or it's not loading.
                  // The validator will handle if it's empty on submission.
                  disabled={projectsLoading && !projects?.length || !!projectsError && !projects?.length}
                />
              )}
            />
            {projectsError && !projects?.length && <ErrorMessage msg="Erro ao carregar projetos. Não é possível criar tarefas."/>}
            <ErrorMessage msg={errors.projectId?.message?.toString()} />
          </div>

          <div className="relative grid gap-1 pb-4">
            <ShadcnLabel className="text-sm font-medium" htmlFor="deadline">
              Prazo
            </ShadcnLabel>
            <Controller
              control={control}
              name="deadline"
              defaultValue={task.deadline} // Use defaultValue from task prop
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "justify-start text-left font-normal w-full h-9 px-3 py-2 text-sm", // Standardized size/padding
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
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            <ErrorMessage msg={errors.deadline?.message?.toString()} />
          </div>
          <div className="relative grid gap-1 pb-4">
            <ShadcnLabel className="text-sm font-medium" htmlFor="label">
              Etiquetas
            </ShadcnLabel>
            <Controller
              control={control}
              name="label" // This should be an array of strings (label names)
              defaultValue={task.label || []} // task.label from Todo is string[]
              render={({ field }) => (
                <CustomizedMultSelect
                  value={field.value || []} // Expects string[]
                  onChange={field.onChange} // Receives string[]
                  placeholder="Selecione etiquetas"
                  options={labelOptionsForSelect} // Pass string[] (label names) for options
                  isLoading={labelsLoading}
                />
              )}
            />
            {labelsError && <ErrorMessage msg="Erro ao carregar etiquetas."/>}
            <ErrorMessage msg={errors.label?.message?.toString()} />
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
          // Add the task ID for edit operations if it exists
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
              {/* Main content area */} 
              <div className="flex flex-col gap-4 flex-1">
                <div className="relative grid gap-1">
                  <ShadcnLabel className="text-sm font-medium" htmlFor="title">
                    Título
                  </ShadcnLabel>
                  <Input
                    id="title"
                    className="w-full h-9 px-3 py-2 text-sm" // Standardized size/padding
                    {...register("title")}
                  />
                  <ErrorMessage msg={errors.title?.message?.toString()} />
                </div>
                
                {/* Render ExtraInfoField on small screens here */} 
                {!md && <ExtraInfoField />}
                
                <div className="relative grid gap-1 h-80"> {/* Reduced height slightly */} 
                  <ShadcnLabel className="text-sm font-medium" htmlFor="description">
                    Descrição
                  </ShadcnLabel>
                  <Controller
                    control={control}
                    name="description"
                    defaultValue={task.description || ""} // Use defaultValue
                    render={({ field }) => (
                      <CustomizedReactQuill
                        theme="snow"
                        value={field.value || ""} // Ensure value is a string
                        onChange={field.onChange}
                        className="h-[calc(100%-1.75rem)]" // Adjusted height calculation
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
                      disabled={!task.id || isDeleteLoading} // Disable if no task id or already deleting
                    >
                      Excluir Tarefa
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Sidebar for extra info on larger screens */} 
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

