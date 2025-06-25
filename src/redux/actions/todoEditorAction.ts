import { Todo } from "@prisma/client";

export enum TodoEditorActionType {
  OPEN_TODO_EDITOR = "OPEN_TODO_EDITOR",
  CLOSE_TODO_EDITOR = "CLOSE_TODO_EDITOR",
}

export interface CloseTodoEditorI {
  type: TodoEditorActionType.CLOSE_TODO_EDITOR;
  payload: null;
}

export type TodoEditType = "create" | "edit";

export interface OpenTodoEditorI<T extends TodoEditType> {
  type: TodoEditorActionType.OPEN_TODO_EDITOR;
  payload: {
    todo: T extends "edit" ? Todo : TaskCreatorDefaultValues;
    taskEditorCaller: string;
    type: T;
  };
}

export type TaskCreatorDefaultValues = Partial<
  Pick<OptionalTodo, "deadline" | "state">
>;

export const closeTodoEditor = (): CloseTodoEditorI => {
  return {
    type: TodoEditorActionType.CLOSE_TODO_EDITOR,
    payload: null,
  };
};

export const openTodoEditor = <T extends TodoEditType>(
  todo: T extends "edit" ? Todo : TaskCreatorDefaultValues,
  taskEditorCaller: string,
  type: T,
): OpenTodoEditorI<T> => {
  return {
    type: TodoEditorActionType.OPEN_TODO_EDITOR,
    payload: {
      todo,
      taskEditorCaller,
      type,
    },
  };
};

export type TodoEditorAction =
  | CloseTodoEditorI
  | OpenTodoEditorI<"create">
  | OpenTodoEditorI<"edit">;
