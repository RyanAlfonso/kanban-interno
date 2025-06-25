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
    // Allow task to potentially be null initially or if state is cleared
    (state) => state.editTodo.targetTodo,
  );

  const caller = useSelector<ReduxState, string>(
    (state) => state.editTodo.taskEditorCaller,
  );

  // Remove the non-null assertion '!' and allow type to be null
  const type = useSelector<ReduxState, "create" | "edit" | null>(
    (state) => state.editTodo.taskEditType,
  );

  const onClose = () => {
    dispatch(closeTodoEditor());
  };

  const handleOnSuccess = () => {
    onClose();
    // Only push if caller is defined, prevent error if it's empty string
    if (caller) {
        router.push(caller);
    }
  };

  // Add checks for task and type before rendering controllers
  if (!isOpen || !task || !type) return null;

  return (
    <CustomizedDialog open={isOpen} onClose={onClose}>
      {type === "edit" ? (
        <TaskEditFormController
          handleOnSuccess={handleOnSuccess}
          handleOnClose={onClose}
          // Ensure task is treated as Todo here, might need better type guarding if task structure differs significantly
          task={task as Todo} 
          key={"edit"}
        />
      ) : (
        <TaskCreateFormController
          handleOnSuccess={handleOnSuccess}
          handleOnClose={onClose}
          // Ensure task is treated as TaskCreatorDefaultValues here
          task={task as TaskCreatorDefaultValues}
          key={"create"}
        />
      )}
    </CustomizedDialog>
  );
};

export default TaskEditFormDialog;

