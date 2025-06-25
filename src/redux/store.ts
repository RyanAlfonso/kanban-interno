import { composeWithDevTools } from "@redux-devtools/extension";
import {
  combineReducers,
  legacy_createStore as createStore,
  applyMiddleware,
  AnyAction,
  Store,
} from "redux";
import thunk, { ThunkAction, ThunkDispatch } from "redux-thunk";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import editTodo from "@/redux/reducers/todoEditorReducer";
import sidebar from "@/redux/reducers/sidebarReducer";
import { createWrapper } from "next-redux-wrapper";

const rootReducer = combineReducers({
  editTodo,
  sidebar,
});

export const store = createStore(
  rootReducer,
  composeWithDevTools(applyMiddleware(thunk)),
);

const makeStore = () => store;
export const wrapper = createWrapper<Store<ReduxState>>(makeStore, {
  debug: true,
});

export type AppDispatch = typeof store.dispatch;
export type ReduxState = ReturnType<typeof rootReducer>;
export type TypedDispatch = ThunkDispatch<ReduxState, any, AnyAction>;
export type TypedThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  ReduxState,
  unknown,
  AnyAction
>;
export const useTypedDispatch = () => useDispatch<TypedDispatch>();
export const useTypedSelector: TypedUseSelectorHook<ReduxState> = useSelector;
export default store;
