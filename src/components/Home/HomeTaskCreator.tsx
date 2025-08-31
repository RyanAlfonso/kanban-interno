"use client";

import { openTodoEditor } from "@/redux/actions/todoEditorAction";
// --- 1. IMPORTE OS HOOKS DE NAVEGAÇÃO ---
import { usePathname, useSearchParams } from "next/navigation";
import { FC } from "react";
import { useDispatch } from "react-redux";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";

type HomeTaskCreatorProps = {
  columnId: string;
  projectId?: string;
};

const HomeTaskCreator: FC<HomeTaskCreatorProps> = ({ columnId, projectId }) => {
  const dispatch = useDispatch();
  // --- 2. INICIALIZE OS HOOKS ---
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleOpenDialog = () => {
    // --- 3. CONSTRUA A URL DE RETORNO DINÂMICA ---
    const returnUrl = `${pathname}?${searchParams.toString()}`;

    // --- 4. PASSE A URL CORRETA PARA A ACTION ---
    dispatch(openTodoEditor({ columnId, projectId }, returnUrl, "create"));
  };

  return (
    <div className="p-2 border-t dark:border-gray-700 sticky bottom-0 bg-inherit rounded-b-lg">
      <Button
        variant="ghost"
        className="w-full justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        onClick={handleOpenDialog} // A função agora está corrigida
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Criar Tarefa
      </Button>
    </div>
  );
};

export default HomeTaskCreator;
