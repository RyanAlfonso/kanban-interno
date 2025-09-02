import useEsc from "@/hooks/useEsc";
import clsx from "clsx";
import { FC, useRef } from "react";

type CustomizedDialogProps = {
  children?: JSX.Element;
  open: boolean;
  onClose?: () => void;
};

const CustomizedDialog: FC<CustomizedDialogProps> = ({
  open,
  children,
  onClose = () => {},
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);


  useEsc(onClose);

  if (!open) return null;

  return (
    <>
      <div className="absolute w-screen h-screen z-10 bg-zinc-500/30 backdrop-blur-[1px] inset-0" />
      <div
        className={clsx(
          "absolute sm:inset-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 rounded-xl shadow-lg z-20 sm:h-fit md:w-[768px] sm:w-[90%] w-screen h-screen inset-0"
        )}
        ref={dialogRef}
      >
        {children}
      </div>
    </>
  );
};

export default CustomizedDialog;
