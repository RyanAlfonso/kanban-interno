import {
  TaskCreatorDefaultValues,
  closeTodoEditor,
} from "@/redux/actions/todoEditorAction";
import { ReduxState } from "@/redux/store";
import { useRouter } from "next/navigation";
import { FC } from "react";
import { useDispatch, useSelector } from "react-redux";
import CustomizedDialog from "./CustomizedDialog";
import TaskCreateFormController from "./TaskCreateFormController";
import TaskEditFormController from "./TaskEditFormController";
import { Todo } from "@prisma/client";

const TaskEditFormDialog: FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const isOpen = useSelector<ReduxState, boolean>(
    (state) => state.editTodo.isTodoEditorOpen,
  );

  const task = useSelector<ReduxState, Todo | TaskCreatorDefaultValues | null>(
    (state) => state.editTodo.targetTodo,
  );

  const caller = useSelector<ReduxState, string>(
    (state) => state.editTodo.taskEditorCaller,
  );

  const type = useSelector<ReduxState, "create" | "edit" | null>(
    (state) => state.editTodo.taskEditType,
  );

  const onClose = () => {
    dispatch(closeTodoEditor());
  };

  const handleOnSuccess = () => {
    onClose();
    if (caller) {
        router.push(caller);
    }
  };

  if (!isOpen || !task || !type) return null;

  return (
    <CustomizedDialog open={isOpen} onClose={onClose}>
      {type === "edit" ? (
        <TaskEditFormController
          handleOnSuccess={handleOnSuccess}
          handleOnClose={onClose}
          task={task as Todo} 
          key={"edit"}
        />
      ) : (
        <TaskCreateFormController
          handleOnSuccess={handleOnSuccess}
          handleOnClose={onClose}
          task={task as TaskCreatorDefaultValues}
          key={"create"}
        />
      )}
    </CustomizedDialog>
  );
};

export default TaskEditFormDialog;

