"use client";

import { openTodoEditor } from "@/redux/actions/todoEditorAction";
import { Plus } from "lucide-react";
import { FC } from "react";
import { useDispatch } from "react-redux";

type HeaderTaskCreatorProps = {
  caller: string;
};

const HeaderTaskCreator: FC<HeaderTaskCreatorProps> = ({ caller }) => {
  const dispatch = useDispatch();

  const handleOpenDialog = () => {
    dispatch(openTodoEditor({}, caller, "create"));
  };

  return (
    <div
      className="bg-white rounded-lg shadow-lg flex items-center p2 text-foreground hover:bg-zinc-100 cursor-pointer p-1"
      onClick={handleOpenDialog}
    >
      <Plus color="#808080" />
    </div>
  );
};

export default HeaderTaskCreator;
