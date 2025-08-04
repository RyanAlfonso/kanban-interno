"use client";

import useBackupState from "@/hooks/useBackupState";
import useClickOutSide from "@/hooks/useClickOutSide";
import useEsc from "@/hooks/useEsc";
import { cn } from "@/lib/utils";
import { Check, CircleX, X } from "lucide-react";
import {
  FC,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Option = {
  value: string;
  title: string;
};

type CustomizedMultSelectProps = {
  options?: Option[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
};

const CustomizedMultSelect: FC<CustomizedMultSelectProps> = ({
  options = [],
  value = [],
  onChange,
  placeholder,
}) => {
  const [privateValue, setPrivateValue] = useState<string[]>(value);
  const {
    state: privateOptions,
    setState: setPrivateOptions,
    setBackupState: setPrivateOptionsBackup,
    backupState: privateOptionsBackup,
    reset: resetOptions,
  } = useBackupState({ initialState: options });
  
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState<string>("");
  const selectorRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleOnClose = useCallback(() => {
    setOpen(false);
    setSearchValue("");
    resetOptions();
  }, [resetOptions]);
  useClickOutSide(selectorRef, handleOnClose);
  useEsc(handleOnClose);

  useEffect(() => {
    if (!open || !searchRef.current) return;
    searchRef.current.focus();
  }, [open]);
  
  useEffect(() => {
    setPrivateValue(value);
  }, [value]);

  useEffect(() => {
    setPrivateOptions(options);
    setPrivateOptionsBackup(options);
  }, [options, setPrivateOptions, setPrivateOptionsBackup]);


  const handleOpen = () => {
    setOpen((prev) => !prev);
  };

  const clearSelected = () => {
    setPrivateValue([]);
    if (onChange) onChange([]);
  };

  const onSelect = (optionValue: string) => {
    setSearchValue("");
    const newValue = privateValue.includes(optionValue)
      ? privateValue.filter((v) => v !== optionValue)
      : [...privateValue, optionValue];
    setPrivateValue(newValue);
    resetOptions();
    if (onChange) onChange(newValue);
  };

  const removeSelected = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    onSelect(optionValue);
  };
  
  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    if (!value) {
      resetOptions();
      return;
    }

    const filteredOptions = privateOptionsBackup.filter((option) =>
      option.title.toLowerCase().includes(value.toLowerCase()),
    );
    setPrivateOptions(filteredOptions);
  };

  const handleInputOnKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
        e.preventDefault();
        if (privateOptions.length > 0) {
            onSelect(privateOptions[0].value);
        }
    } else if (e.key === "Backspace" && searchValue.length === 0 && privateValue.length > 0) {
        e.preventDefault();
        const lastValue = privateValue[privateValue.length - 1];
        if (lastValue) {
            onSelect(lastValue);
        }
    } else if (e.key === "Escape") {
        handleOnClose();
    }
  };

  const getTitleById = (id: string) => {
    return options.find(opt => opt.value === id)?.title || id;
  };

  return (
    <div className="relative text-sm text-left max-w-full">
      <div
        className="relative bg-background border rounded-lg"
        ref={selectorRef}
      >
        <div
          onClick={handleOpen}
          className="py-2 px-4 flex justify-between items-center cursor-pointer max-w-full"
        >
          <div className="flex flex-wrap justify-start max-w-full gap-1">
            {privateValue.length > 0 ? (
              privateValue.map((id) => (
                <div
                  key={id}
                  className="inline-flex bg-slate-200 dark:bg-slate-800 max-w-[180px] items-center rounded-sm"
                >
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-0.5">
                    {getTitleById(id)}
                  </div>
                  <div
                      className="w-5 h-5 cursor-pointer p-1 flex items-center justify-center hover:bg-rose-300 dark:hover:bg-rose-600"
                      onClick={(e) => removeSelected(e, id)}
                    >
                      <X className="w-3 h-3" />
                  </div>
                </div>
              ))
            ) : (
              !open && (
                <span className="text-muted-foreground">{placeholder}</span>
              )
            )}
            {open && (
              <div className="inline-flex grow min-w-[20px] max-w-full ml-1 overflow-hidden">
                <input
                  ref={searchRef}
                  onChange={onSearch}
                  value={searchValue}
                  className="w-full min-w-0 outline-none border-none bg-transparent"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={handleInputOnKeyDown}
                />
              </div>
            )}
          </div>
          {privateValue.length > 0 && (
            <div>
              <CircleX className="w-4 h-4 ml-1 cursor-pointer" onClick={clearSelected} />
            </div>
          )}
        </div>
        {open && (
          <div className="absolute bg-white dark:bg-gray-800 my-1 w-full border rounded-md z-50 max-h-60 overflow-y-auto">
            {privateOptions.length > 0 ? privateOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "py-2 px-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 flex justify-between items-center",
                  privateValue.includes(option.value) && "bg-accent",
                )}
                onClick={() => onSelect(option.value)}
              >
                <div className="break-words">{option.title}</div>
                {privateValue.includes(option.value) && (
                  <Check className="w-4 h-4 ml-2" />
                )}
              </div>
            )) : (
              <div className="py-2 px-4 text-muted-foreground">Nenhum resultado.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizedMultSelect;