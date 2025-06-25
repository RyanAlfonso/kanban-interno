"use client";

import { State, Todo } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import TableSortedIcon from "./TableSortedIcon";
import TodoTable from "./TodoTable";
// Update import from react-query to @tanstack/react-query
import { useQuery } from "@tanstack/react-query"; 
import todoFetchRequest from "@/requests/todoFetchRequest";
import { Skeleton } from "../ui/skeleton"; // Import Skeleton
import { AxiosError } from "axios"; // Import AxiosError for error handling
import { useToast } from "../ui/use-toast"; // Import useToast

const TodoTableManager = () => {
  console.log("Rendering TodoTableManager..."); // Added log
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast(); // Initialize toast

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update useQuery syntax for v4+
  const { data: todos, isLoading, error } = useQuery<Todo[], Error>({
    queryKey: ["todos"], // Query key as array
    queryFn: () => todoFetchRequest(), // Fetch function
    onError: (err) => {
      console.error("Error fetching todos for table:", err);
      // Show toast on error
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
      cell: ({ row }) => <div className="truncate max-w-xs" title={row.original.title}>{row.original.title}</div>, // Add truncate and title
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
      enableSorting: false, // Disable sorting for label array
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

  // Wait for mount to avoid hydration errors
  if (!isMounted) {
      // Render skeleton during SSR or before mount
      return (
          <div className="p-6">
              <Skeleton className="h-96 w-full" />
          </div>
      );
  }

  // Handle loading state after mount
  if (isLoading) {
    console.log("TodoTableManager loading...");
    return (
      <div className="p-6">
        <Skeleton className="h-12 w-full mb-4" /> {/* Skeleton for potential filters/header */}
        <Skeleton className="h-96 w-full" /> {/* Skeleton for table */}
      </div>
    );
  }

  // Handle error state
  if (error) {
    console.error("TodoTableManager render error:", error);
    // Error toast is shown by useQuery's onError, display simple message here
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

