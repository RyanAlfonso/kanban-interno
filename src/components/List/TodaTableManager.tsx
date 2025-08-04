"use client";

import { State, Todo } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import TableSortedIcon from "./TableSortedIcon";
import TodoTable from "./TodoTable";
import { useQuery } from "@tanstack/react-query"; 
import todoFetchRequest from "@/requests/todoFetchRequest";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "../ui/use-toast";

const TodoTableManager = () => {
  console.log("Rendering TodoTableManager..."); 
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast(); 

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: todos, isLoading, error } = useQuery<Todo[], Error>({
    queryKey: ["todos"],
    queryFn: () => todoFetchRequest(),
    onError: (err) => {
      console.error("Error fetching todos for table:", err);
      toast({
        title: "Erro ao Carregar Tarefas",
        description: err.message || "Não foi possível buscar as tarefas para a tabela.",
        variant: "destructive",
      });
    }
  });

  const order = useMemo(() => Object.values(State), []);

  const todoColumns: ColumnDef<Todo>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Title</span>
          <TableSortedIcon
            isSorted={!!column.getIsSorted()}
            isSortedDesc={column.getIsSorted() === "desc"}
          />
        </Button>
      ),
      cell: ({ row }) => <div className="truncate max-w-xs" title={row.original.title}>{row.original.title}</div>,
    },
    {
      accessorKey: "state",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">State</span>
          <TableSortedIcon
            isSorted={!!column.getIsSorted()}
            isSortedDesc={column.getIsSorted() === "desc"}
          />
        </Button>
      ),
      sortingFn: (rowA, rowB) => {
        return (
          order.indexOf(rowA.original.state) -
          order.indexOf(rowB.original.state)
        );
      },
      cell: ({ row }) => <span className="capitalize">{row.original.state.toLowerCase().replace("_", " ")}</span>, // Format state
    },
    {
      accessorKey: "deadline",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Deadline</span>
          <TableSortedIcon
            isSorted={!!column.getIsSorted()}
            isSortedDesc={column.getIsSorted() === "desc"}
          />
        </Button>
      ),
      cell: ({ row }) => {
        if (!row.original.deadline) return <span className="text-muted-foreground">-</span>;
        return dayjs(row.original.deadline).format("YYYY/MM/DD");
      },
    },
    {
      accessorKey: "label",
      header: "Label",
      cell: ({ row }) => {
        const labels = row.original.label || [];
        if (labels.length === 0) return <span className="text-muted-foreground">-</span>;

        return (
          <div className="flex gap-1 flex-wrap max-w-xs">
            {labels.map((label) => {
              return (
                <span
                  key={label}
                  className="px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-700 text-xs whitespace-nowrap"
                  title={label}
                >
                  {label}
                </span>
              );
            })}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Created At</span>
          <TableSortedIcon
            isSorted={!!column.getIsSorted()}
            isSortedDesc={column.getIsSorted() === "desc"}
          />
        </Button>
      ),
      cell: ({ row }) => {
        return dayjs(row.original.createdAt).format("YYYY/MM/DD");
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Updated At</span>
          <TableSortedIcon
            isSorted={!!column.getIsSorted()}
            isSortedDesc={column.getIsSorted() === "desc"}
          />
        </Button>
      ),
      cell: ({ row }) => {
        return dayjs(row.original.updatedAt).format("YYYY/MM/DD");
      },
    },
  ];

  if (!isMounted) {
      return (
          <div className="p-6">
              <Skeleton className="h-96 w-full" />
          </div>
      );
  }

  if (isLoading) {
    console.log("TodoTableManager loading...");
    return (
      <div className="p-6">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-96 w-full" /> 
      </div>
    );
  }

  if (error) {
    console.error("TodoTableManager render error:", error);
    return <div className="p-6 text-red-500">Erro ao carregar tarefas. Tente recarregar a página.</div>;
  }
  
  console.log("TodoTableManager rendering table with data:", todos);
  try {
    return (
      <div className="p-6">
        <TodoTable columns={todoColumns} data={todos || []} />
      </div>
    );
  } catch (renderError) {
      console.error("Error rendering TodoTableManager content:", renderError);
      return <div className="p-6 text-red-500">Ocorreu um erro ao renderizar a tabela de tarefas.</div>;
  }
};

export default TodoTableManager;

