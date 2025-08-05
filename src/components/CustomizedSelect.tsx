import useClickOutSide from "@/hooks/useClickOutSide";
import useEsc from "@/hooks/useEsc";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { FC, useCallback, useEffect, useRef, useState } from "react";

const HEIGHT_OF_OPINION = 32;
const MARGIN_OF_SELECTOR = 8;

export type Option = {
  value: string;
  title: string;
  render?: JSX.Element | null;
};

type CustomizedSelectProps = {
  options: Readonly<Option[]>;
  placeholder?: string;
  onChange?: (value: string) => void;
  value?: Option["value"];
};

const CustomizedSelect: FC<CustomizedSelectProps> = ({
  options,
  placeholder = "Please select",
  onChange = () => {},
  value,
}) => {
  const [privateValue, setPrivateValue] = useState<Option | null>(
    value ? options.find((option) => option.value === value) || null : null,
  );
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectorWrapperRef = useRef<HTMLDivElement>(null);

  const handleOnClose = useCallback(() => {
    setOpen(false);
  }, []);
  useClickOutSide(selectorWrapperRef, handleOnClose);
  useEsc(handleOnClose);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (open || !selectorRef?.current) return;

    const spaceLeft =
      window.innerHeight - selectorRef.current?.getBoundingClientRect().bottom;
    const numberOfOpinion = Object.keys(options).length;
    const isOverflow =
      spaceLeft < numberOfOpinion * HEIGHT_OF_OPINION + MARGIN_OF_SELECTOR;
    setUp(isOverflow);
  };

  const handleOnSelect = (option: Option) => {
    setPrivateValue(option);
    setOpen(false);
    onChange(option.value);
  };

  const selectorHeight =
    Object.keys(options).length * HEIGHT_OF_OPINION + MARGIN_OF_SELECTOR;

  const orderedOptions = up ? options.slice().reverse() : options;

  return (
    <div className="relative text-sm text-left" ref={selectorWrapperRef}>
      <div className="w-full border rounded-lg" ref={selectorRef}>
        <div
          onClick={handleOpen}
          className="py-2 px-4 flex justify-between items-center cursor-pointer"
        >
          <div
            className={cn(
              "pr-4",
              (value !== null || privateValue !== null) &&
                "text-muted-foreground",
            )}
          >
            {privateValue?.title || placeholder}
          </div>
          <ChevronDown className="text-sm w-3 h-3" />
        </div>
      </div>
      {open && (
        <div
          className="absolute bg-white dark:bg-gray-900 my-1 w-full border rounded-md z-10"
          style={{ top: up ? `-${selectorHeight}px` : "" }}
        >
          {orderedOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => handleOnSelect(option)}
              className={cn(
                "py-2 px-4 flex justify-between items-center cursor-pointer hover:bg-accent",
                (value === option.value ||
                  privateValue?.value === option.value) &&
                  "bg-accent",
              )}
            >
              <div className="pr-4">{option.title}</div>
              {option.render}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomizedSelect;
