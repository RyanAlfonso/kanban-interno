"use client";

import useBreakpoint from "@/hooks/useBreakpoint";
import { PREDEFINED_TAGS } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { Attachment, Comment, Project, Todo, User } from "@prisma/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import {
  CalendarIcon,
  X,
  PaperclipIcon,
  Download,
  Trash2,
  UserCircle,
  MessageSquare,
  Send,
  History, // NOVO: Ícone de histórico
  ChevronDown, // NOVO: Ícone de seta
  ChevronUp, // NOVO: Ícone de seta
} from "lucide-react";
import { FC, lazy, useState } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import {
  UseMutationResult,
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import "react-quill/dist/quill.snow.css";
import CustomizedMultSelect from "./CustomizedMultSelect";
import CustomizedSelect from "./CustomizedSelect";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/use-toast";
import axios from "axios";

// NOVO: Tipagem para o histórico de movimentação, para garantir consistência.
type MovementHistoryItem = {
  id: string;
  movedAt: Date;
  movedBy: { name: string | null };
  fromColumn: { name: string };
  toColumn: { name: string };
};

// NOVO: Tipagem estendida para a tarefa, incluindo o histórico.
type ExtendedTask = Partial<Todo> & {
  attachments?: AttachmentWithUploader[];
  comments?: CommentWithAuthor[];
  assignedToIds?: string[];
  linkedCardIds?: string[];
  movementHistory?: MovementHistoryItem[]; // Adicionando o histórico aqui
};

// Tipos e Componente para Anexos
type AttachmentWithUploader = Attachment & {
  uploadedBy: Pick<User, "id" | "name" | "image">;
};

type AttachmentItemProps = {
  attachment: AttachmentWithUploader;
  onDelete: (id: string) => void;
  isDeleting: boolean;
};

const AttachmentItem: FC<AttachmentItemProps> = ({
  attachment,
  onDelete,
  isDeleting,
}) => {
  return (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-3 overflow-hidden">
        {attachment.uploadedBy.image ? (
          <img
            src={attachment.uploadedBy.image}
            alt={attachment.uploadedBy.name || "Avatar"}
            className="h-6 w-6 rounded-full flex-shrink-0"
          />
        ) : (
          <UserCircle className="h-6 w-6 text-gray-500 flex-shrink-0" />
        )}
        <div className="flex flex-col overflow-hidden">
          <span
            className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate"
            title={attachment.filename}
          >
            {attachment.filename}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Enviado por {attachment.uploadedBy.name} em{" "}
            {dayjs(attachment.createdAt).format("DD/MM/YYYY")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          download
        >
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="h-4 w-4" />
          </Button>
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-600"
          onClick={() => onDelete(attachment.id)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Tipos e Componente para Comentários
type CommentWithAuthor = Comment & {
  author: Pick<User, "id" | "name" | "image">;
};

type CommentItemProps = {
  comment: CommentWithAuthor;
};

const CommentItem: FC<CommentItemProps> = ({ comment }) => {
  return (
    <div className="flex items-start gap-3 p-2">
      {comment.author.image ? (
        <img
          src={comment.author.image}
          alt={comment.author.name || "Avatar"}
          className="h-8 w-8 rounded-full flex-shrink-0"
        />
      ) : (
        <UserCircle className="h-8 w-8 text-gray-500 flex-shrink-0" />
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {comment.author.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {dayjs(comment.createdAt).format("DD/MM/YYYY HH:mm")}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>
    </div>
  );
};

// NOVO: Componente para exibir o histórico de movimentação
const MovementHistory: FC<{ history: MovementHistoryItem[] }> = ({ history }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="relative grid gap-2 pt-4">
      <Label
        className="text-sm font-medium flex items-center gap-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <History className="h-4 w-4" />
        Histórico de Movimentação ({history.length})
        {isOpen ? (
          <ChevronUp className="h-4 w-4 ml-auto" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-auto" />
        )}
      </Label>
      {isOpen && (
        <div className="flex flex-col gap-1 rounded-lg border bg-slate-50 dark:bg-slate-800 p-2 max-h-60 overflow-y-auto">
          {history.map((movement) => (
            <div key={movement.id} className="text-xs p-2 border-l-2 border-gray-300 dark:border-gray-600 ml-1">
              <p className="font-medium text-gray-800 dark:text-gray-200">
                <span className="font-bold">{movement.movedBy?.name || "Usuário desconhecido"}</span> moveu de 
                <span className="font-semibold"> "{movement.fromColumn.name}"</span> para 
                <span className="font-semibold"> "{movement.toColumn.name}"</span>.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {dayjs(movement.movedAt).format("DD/MM/YYYY [às] HH:mm")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// Props do Formulário Principal
type TaskEditFormProps = {
  handleOnClose: () => void;
  task: ExtendedTask; // NOVO: Usando a tipagem estendida
  title: string;
  enableDelete?: boolean;
  deleteMutationFunctionReturn?: UseMutationResult<
    Todo[],
    AxiosError,
    { id: string },
    any
  >;
  editMutationFunctionReturn: UseMutationResult<
    Todo | Todo[],
    AxiosError,
    any,
    any
  >;
  formFunctionReturn: UseFormReturn<any>;
};

const CustomizedReactQuill = lazy(() => import("./CustomizedReactQuill"));

type ErrorMessageProps = {
  msg?: string;
};

async function robustFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    let errorData = {
      message: `Erro ${response.status}: ${response.statusText}`,
    };
    try {
      const jsonError = await response.json();
      if (jsonError && jsonError.message) {
        errorData.message = jsonError.message;
      }
    } catch (e) {
      console.error("A resposta de erro não era JSON:", e);
    }
    throw new Error(errorData.message);
  }
  return response.json();
}

const TaskModificationForm: FC<TaskEditFormProps> = ({
  handleOnClose,
  task,
  title,
  enableDelete,
  deleteMutationFunctionReturn,
  editMutationFunctionReturn,
  formFunctionReturn,
}) => {
  const { md } = useBreakpoint();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
  } = formFunctionReturn;

  const { mutate: submitEditTodoTask, isPending: isEditLoading } =
    editMutationFunctionReturn;
  const { mutate: deleteFunc, isPending: isDeleteLoading } =
    deleteMutationFunctionReturn ?? { mutate: () => {}, isPending: false };

  const { mutate: deleteAttachment, isPending: isDeletingAttachment } =
    useMutation({
      mutationFn: async (attachmentId: string) => {
        const { data } = await axios.delete(
          `/api/attachments?id=${attachmentId}`
        );
        return data;
      },
      onSuccess: () => {
        toast({ title: "Sucesso!", description: "Anexo excluído." });
        queryClient.invalidateQueries({ queryKey: ["todos"] });
      },
      onError: (error: AxiosError) => {
        const errorData = error.response?.data as { message?: string };
        toast({
          title: "Erro ao excluir",
          description:
            errorData?.message || "Não foi possível excluir o anexo.",
          variant: "destructive",
        });
      },
    });

  const { mutate: postComment, isPending: isPostingComment } = useMutation({
    mutationFn: async (content: string) => {
      if (!task.id) throw new Error("ID da tarefa não encontrado.");
      const payload = { content, todoId: task.id };
      const { data } = await axios.post("/api/comments", payload);
      return data;
    },
    onSuccess: () => {
      setNewComment("");
      toast({ title: "Sucesso!", description: "Comentário adicionado." });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: (error: AxiosError) => {
      const errorData = error.response?.data as { message?: string };
      toast({
        title: "Erro ao comentar",
        description:
          errorData?.message || "Não foi possível adicionar o comentário.",
        variant: "destructive",
      });
    },
  });

  const handlePostComment = () => {
    if (newComment.trim()) {
      postComment(newComment.trim());
    }
  };

  const tagOptions = [...PREDEFINED_TAGS];

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: () => robustFetcher<Project[]>("/api/projects"),
  });

  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<User[], Error>({
    queryKey: ["users"],
    queryFn: () => robustFetcher<User[]>("/api/users"),
  });

  const {
    data: todos,
    isLoading: todosLoading,
    error: todosError,
  } = useQuery<Todo[], Error>({
    queryKey: ["todos"],
    queryFn: () => robustFetcher<Todo[]>("/api/todo"),
  });

  const projectOptions =
    projects?.map((project) => ({ value: project.id, title: project.name })) ||
    [];
  const userOptions =
    users?.map((user) => ({
      value: user.id,
      title: user.name || user.email || "Usuário sem nome",
    })) || [];
  const todoOptions =
    todos
      ?.filter((t) => t.id !== task.id)
      .map((todo) => ({ value: todo.id, title: todo.title })) || [];

  const ErrorMessage = ({ msg }: ErrorMessageProps) =>
    msg ? <span className="text-red-500 text-xs">{msg}</span> : null;

  const handleAttachmentChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || event.target.files.length === 0) return;
    if (!task.id) {
      toast({
        title: "Ação necessária",
        description: "Por favor, salve a tarefa antes de adicionar anexos.",
        variant: "default",
      });
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    for (const file of Array.from(event.target.files)) {
      formData.append("files", file);
    }
    try {
      const response = await fetch(`/api/attachments/upload/${task.id}`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        let errorData = { message: `Falha no upload: ${response.statusText}` };
        try {
          const jsonError = await response.json();
          if (jsonError && jsonError.message)
            errorData.message = jsonError.message;
        } catch (e) {}
        throw new Error(errorData.message);
      }
      const result = await response.json();
      toast({
        title: "Sucesso!",
        description: `${result.uploadedCount} anexo(s) enviado(s) com sucesso.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    } catch (error: any) {
      toast({
        title: "Erro no Upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const ExtraInfoField = () => (
    <>
      <div className="relative grid gap-1 pb-4">
        <Label className="text-sm font-medium" htmlFor="projectId">
          Áreas
        </Label>
        <Controller
          control={control}
          name="projectId"
          defaultValue={task.projectId?.toString() || ""}
          render={({ field }) => (
            <CustomizedSelect
              options={projectOptions}
              placeholder="Selecione a área"
              onChange={field.onChange}
              value={field.value?.toString() || ""}
            />
          )}
        />
        {projectsError && <ErrorMessage msg={projectsError.message} />}
        {!projectsLoading && projectOptions.length === 0 && (
          <ErrorMessage msg="Nenhuma área disponível." />
        )}
        <ErrorMessage msg={errors.projectId?.message?.toString()} />
      </div>
      <div className="relative grid gap-1 pb-4">
        <Label className="text-sm font-medium" htmlFor="assignedToIds">
          Usuários Responsáveis
        </Label>
        <Controller
          control={control}
          name="assignedToIds"
          defaultValue={task.assignedToIds || []}
          render={({ field }) => (
            <CustomizedMultSelect
              value={field.value || []}
              onChange={field.onChange}
              placeholder="Selecione usuários"
              options={userOptions}
            />
          )}
        />
        {usersError && <ErrorMessage msg={usersError.message} />}
        {!usersLoading && userOptions.length === 0 && (
          <ErrorMessage msg="Nenhum usuário disponível." />
        )}
        <ErrorMessage msg={errors.assignedToIds?.message?.toString()} />
      </div>
      <div className="relative grid gap-1 pb-4">
        <Label className="text-sm font-medium" htmlFor="parentId">
          Card Pai
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
        {todosError && <ErrorMessage msg={todosError.message} />}
        <ErrorMessage msg={errors.parentId?.message?.toString()} />
      </div>
      <div className="relative grid gap-1 pb-4">
        <Label className="text-sm font-medium" htmlFor="linkedCardIds">
          Cards Relacionados
        </Label>
        <Controller
          control={control}
          name="linkedCardIds"
          defaultValue={task.linkedCardIds || []}
          render={({ field }) => (
            <CustomizedMultSelect
              value={field.value || []}
              onChange={field.onChange}
              placeholder="Selecione cards"
              options={todoOptions}
            />
          )}
        />
        {todosError && <ErrorMessage msg={todosError.message} />}
        <ErrorMessage msg={errors.linkedCardIds?.message?.toString()} />
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
                    !field.value && "text-muted-foreground"
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
                  onSelect={(date) => field.onChange(date || null)}
                  initialFocus
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
              options={tagOptions.map((tag) => ({ value: tag, title: tag }))}
            />
          )}
        />
        <ErrorMessage msg={errors.tags?.message?.toString()} />
      </div>
    </>
  );

  return (
    <form
      onSubmit={handleSubmit((data) => {
        const payload =
          title === "Edit Task" && task.id ? { ...data, id: task.id } : data;
        submitEditTodoTask(payload);
      })}
    >
      <Card className="sm:max-h-[80vh] overflow-y-auto border-none shadow-none">
        <CardHeader className="p-4">
          <CardTitle className="flex justify-between items-center">
            <div className="text-lg font-semibold">{title}</div>
            <Button
              variant="ghost"
              size="icon"
              className="p-0 h-6 w-6"
              onClick={handleOnClose}
            >
              <X className="h-4 w-4" />
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
              <div className="relative grid gap-1">
                <Label
                  className="text-sm font-medium"
                  htmlFor="referenceDocument"
                >
                  Documento de Referência
                </Label>
                <Input
                  id="referenceDocument"
                  className="w-full h-9 px-3 py-2 text-sm"
                  placeholder="URL ou nome do documento (opcional)"
                  {...register("referenceDocument")}
                />
                <ErrorMessage
                  msg={errors.referenceDocument?.message?.toString()}
                />
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

              {task.id && task.attachments && task.attachments.length > 0 && (
                <div className="relative grid gap-2 pt-4">
                  <Label className="text-sm font-medium" htmlFor="attachments">
                    Anexos ({task.attachments.length})
                  </Label>
                  <div className="flex flex-col gap-1 rounded-lg border bg-slate-50 dark:bg-slate-800 p-2 max-h-48 overflow-y-auto">
                    {task.attachments.map((att) => (
                      <AttachmentItem
                        key={att.id}
                        attachment={att}
                        onDelete={deleteAttachment}
                        isDeleting={isDeletingAttachment}
                      />
                    ))}
                  </div>
                </div>
              )}

              {task.id && (
                <div className="relative grid gap-2 pt-4">
                  <Label
                    className="text-sm font-medium flex items-center gap-2"
                    htmlFor="comments"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Comentários
                  </Label>
                  <div className="flex flex-col gap-1 rounded-lg border bg-slate-50 dark:bg-slate-800 p-2 max-h-60 overflow-y-auto">
                    {task.comments && task.comments.length > 0 ? (
                      task.comments.map((comment) => (
                        <CommentItem key={comment.id} comment={comment} />
                      ))
                    ) : (
                      <p className="text-sm text-center text-gray-500 p-4">
                        Nenhum comentário ainda.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Input
                      id="new-comment"
                      placeholder="Adicione um comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                      disabled={isPostingComment}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={handlePostComment}
                      isLoading={isPostingComment}
                      disabled={!newComment.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* NOVO: Renderiza o componente de histórico aqui */}
              {task.id && task.movementHistory && (
                <MovementHistory history={task.movementHistory} />
              )}

              <div className="relative flex gap-2 pt-4">
                <Button type="submit" isLoading={isEditLoading}>
                  {title === "Create Task"
                    ? "Criar Tarefa"
                    : "Salvar Alterações"}
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
                <input
                  id="attachment-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentChange}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("attachment-upload")?.click()
                  }
                  className="ml-auto"
                  isLoading={isUploading}
                  disabled={isUploading || !task.id}
                >
                  <PaperclipIcon className="mr-2 h-4 w-4" />
                  Anexar
                </Button>
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
};

export default TaskModificationForm;
