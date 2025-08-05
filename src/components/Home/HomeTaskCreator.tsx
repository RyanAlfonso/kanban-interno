"use client";

import { openTodoEditor } from "@/redux/actions/todoEditorAction";
import { Todo } from "@prisma/client";
import { Plus, PlusCircle } from "lucide-react";
import { FC } from "react";
import { useDispatch } from "react-redux";
import { Button } from "../ui/button";

type HomeTaskCreatorProps = {
  columnId: string;
  projectId?: string;
};

const HomeTaskCreator: FC<HomeTaskCreatorProps> = ({ columnId, projectId }) => {
  const dispatch = useDispatch();

  const handleOpenDialog = () => {
    dispatch(openTodoEditor({ columnId, projectId }, "/", "create"));
  };

  return (
    <div className="p-2 border-t dark:border-gray-700 sticky bottom-0 bg-inherit rounded-b-lg">
      <Button
        variant="ghost"
        className="w-full justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        onClick={() => handleOpenDialog()}
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Criar Tarefa
      </Button>
    </div>
  );
};

export default HomeTaskCreator;