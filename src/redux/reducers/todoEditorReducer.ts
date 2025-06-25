import { Todo } from "@prisma/client";
import {
  TaskCreatorDefaultValues,
  TodoEditType,
  TodoEditorAction,
  TodoEditorActionType,
} from "../actions/todoEditorAction";

export interface TodoEditorState {
  isTodoEditorOpen: boolean;
  targetTodo: Todo | TaskCreatorDefaultValues;
  taskEditorCaller: string;
  taskEditType: TodoEditType | null;
}

const initialState: TodoEditorState = {
  isTodoEditorOpen: false,
  targetTodo: {},
  taskEditorCaller: "",
  taskEditType: null,
};

const reducer = (state = initialState, action: TodoEditorAction): TodoEditorState => {
  switch (action.type) {
    case TodoEditorActionType.OPEN_TODO_EDITOR:
      return {
        ...state,
        isTodoEditorOpen: true,
        targetTodo:
          action.payload.type === "create"
            ? {
                ...action.payload.todo,
              }
            : action.payload.todo,
        taskEditorCaller: action.payload.taskEditorCaller,
        taskEditType: action.payload.type,
      };
    case TodoEditorActionType.CLOSE_TODO_EDITOR:
      return {
        ...state,
        isTodoEditorOpen: false,
        taskEditorCaller: "",
        taskEditType: null,
      };
    default:
      return state;
  }
};

export default reducer;
