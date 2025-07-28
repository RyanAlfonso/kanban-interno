"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, UserIcon, MessageCircleIcon, PaperclipIcon } from "lucide-react";
import dayjs from "dayjs";

interface SharedTodo {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  tags: string[];
  owner: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  project?: {
    id: string;
    name: string;
  };
  column?: {
    id: string;
    name: string;
  };
  assignedTo: Array<{
    id: string;
    name: string;
    email: string;
    image?: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    createdAt: string;
    uploadedBy: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ShareResponse {
  todo: SharedTodo;
  shareableLink: string;
}

export default function SharedTaskPage() {
  const params = useParams();
  const todoId = params.todoId as string;

  const { data, isLoading, error } = useQuery<ShareResponse>({
    queryKey: ["shared-todo", todoId],
    queryFn: async () => {
      const response = await fetch(`/api/share/${todoId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch shared task");
      }
      return response.json();
    },
    enabled: !!todoId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando tarefa...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Tarefa não encontrada</h2>
              <p className="text-muted-foreground">
                A tarefa que você está procurando não existe ou foi removida.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { todo } = data;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{todo.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {todo.project && (
                  <div className="flex items-center gap-1">
                    <span>Projeto:</span>
                    <Badge variant="outline">{todo.project.name}</Badge>
                  </div>
                )}
                {todo.column && (
                  <div className="flex items-center gap-1">
                    <span>Status:</span>
                    <Badge variant="secondary">{todo.column.name}</Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {todo.description && (
            <div>
              <h3 className="font-semibold mb-2">Descrição</h3>
              <div className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: todo.description }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Prazo
              </h3>
              <div className="text-sm">
                {dayjs(todo.deadline).format("DD/MM/YYYY")}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Responsáveis
              </h3>
              <div className="flex flex-wrap gap-2">
                {todo.assignedTo.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.image} />
                      <AvatarFallback>{user.name?.[0] || user.email[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name || user.email}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {todo.tags && todo.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {todo.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {todo.attachments && todo.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <PaperclipIcon className="h-4 w-4" />
                Anexos ({todo.attachments.length})
              </h3>
              <div className="space-y-2">
                {todo.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 p-3 border rounded-md">
                    <PaperclipIcon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {attachment.filename}
                      </a>
                      <div className="text-xs text-muted-foreground">
                        Enviado por {attachment.uploadedBy.name} em {dayjs(attachment.createdAt).format("DD/MM/YYYY HH:mm")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todo.comments && todo.comments.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageCircleIcon className="h-4 w-4" />
                Comentários ({todo.comments.length})
              </h3>
              <div className="space-y-4">
                {todo.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-4 bg-muted/50 rounded-md">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author.image} />
                      <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {dayjs(comment.createdAt).format("DD/MM/YYYY HH:mm")}
                        </span>
                      </div>
                      <div className="text-sm">{comment.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t text-xs text-muted-foreground">
            <div>Criado por {todo.owner.name} em {dayjs(todo.createdAt).format("DD/MM/YYYY HH:mm")}</div>
            {todo.updatedAt !== todo.createdAt && (
              <div>Última atualização em {dayjs(todo.updatedAt).format("DD/MM/YYYY HH:mm")}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}