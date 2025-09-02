"use client";

import {
  TaskCreatorDefaultValues,
  closeTodoEditor,
} from "@/redux/actions/todoEditorAction";
import { ReduxState } from "@/redux/store";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CustomizedDialog from "./CustomizedDialog";
import TaskCreateFormController from "./TaskCreateFormController";
import TaskEditFormController from "./TaskEditFormController";
import { Todo } from "@prisma/client";
import { Button } from "./ui/button";
import { X } from "lucide-react";

const TaskEditFormDialog: FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const [showConfirmation, setShowConfirmation] = useState(false);

  const isOpen = useSelector<ReduxState, boolean>(
    (state) => state.editTodo.isTodoEditorOpen
  );
  const task = useSelector<ReduxState, Todo | TaskCreatorDefaultValues | null>(
    (state) => state.editTodo.targetTodo
  );
  const caller = useSelector<ReduxState, string>(
    (state) => state.editTodo.taskEditorCaller
  );
  const type = useSelector<ReduxState, "create" | "edit" | null>(
    (state) => state.editTodo.taskEditType
  );

  const forceClose = () => {
    setShowConfirmation(false);
    dispatch(closeTodoEditor());
  };

  const handleAttemptClose = (isDirty: boolean) => {
    if (isDirty) {
      setShowConfirmation(true);
    } else {
      forceClose();
    }
  };

  const handleOnSuccess = () => {
    forceClose();
    if (caller) {
      router.push(caller);
    }
  };

  if (!isOpen || !task || !type) return null;

  return (
    <CustomizedDialog
      open={isOpen}
      onClose={() => {
        if (!showConfirmation) {
          handleAttemptClose(false);
        }
      }}
    >
      {showConfirmation ? (
        // AQUI ESTÁ A MUDANÇA: Adicionamos a classe 'bg-card'
        <div className="bg-card p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-card-foreground">
              Sair sem Salvar?
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowConfirmation(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Você fez alterações que não foram salvas. Tem certeza de que deseja
            sair?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={forceClose}>
              Sair
            </Button>
          </div>
        </div>
      ) : (
        <>
          {type === "edit" ? (
            <TaskEditFormController
              handleOnSuccess={handleOnSuccess}
              handleOnClose={handleAttemptClose}
              task={task as Todo}
              key={"edit"}
            />
          ) : (
            <TaskCreateFormController
              handleOnSuccess={handleOnSuccess}
              handleOnClose={handleAttemptClose}
              task={task as TaskCreatorDefaultValues}
              key={"create"}
            />
          )}
        </>
      )}
    </CustomizedDialog>
  );
};

export default TaskEditFormDialog;
