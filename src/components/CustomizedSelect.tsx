import useClickOutSide from "@/hooks/useClickOutSide";
import useEsc from "@/hooks/useEsc";
import { cn } from "@/lib/utils";
import { ChevronDown, Search } from "lucide-react";
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
    value ? options.find((option) => option.value === value) || null : null
  );
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectorWrapperRef = useRef<HTMLDivElement>(null);

  const handleOnClose = useCallback(() => {
    setOpen(false);
    setSearchTerm("");
  }, []);
  useClickOutSide(selectorWrapperRef, handleOnClose);
  useEsc(handleOnClose);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (open || !selectorRef?.current) return;

    const spaceLeft =
      window.innerHeight - selectorRef.current?.getBoundingClientRect().bottom;
    const numberOfOpinion = filteredOptions.length;
    const isOverflow =
      spaceLeft < numberOfOpinion * HEIGHT_OF_OPINION + MARGIN_OF_SELECTOR + 50;
    setUp(isOverflow);
  };

  const handleOnSelect = (option: Option) => {
    setPrivateValue(option);
    setOpen(false);
    onChange(option.value);
    setSearchTerm("");
  };

  const filteredOptions = options.filter((option) =>
    option.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectorHeight =
    filteredOptions.length * HEIGHT_OF_OPINION + MARGIN_OF_SELECTOR + 50;

  const orderedOptions = up
    ? filteredOptions.slice().reverse()
    : filteredOptions;

  return (
    // Esta é a div que você apontou. Ela é apenas um container posicional.
    <div className="relative text-sm text-left" ref={selectorWrapperRef}>
      {/* --- ESTILO APLICADO NO LUGAR CORRETO --- */}
      {/* Este é o botão clicável que deve ter o estilo. */}
      <div
        ref={selectorRef}
        onClick={handleOpen}
        // Usando as classes que se adaptam ao tema via variáveis CSS.
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span
          className={cn(
            "truncate",
            privateValue ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {privateValue?.title || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>

      {open && (
        <div
          className="absolute bg-popover my-1 w-full border rounded-md z-10 flex flex-col"
          style={{ top: up ? `-${selectorHeight}px` : "" }}
        >
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="flex h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-2 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto text-popover-foreground">
            {orderedOptions.length > 0 ? (
              orderedOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleOnSelect(option)}
                  className={cn(
                    "py-2 px-4 flex justify-between items-center cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    (value === option.value ||
                      privateValue?.value === option.value) &&
                      "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="pr-4">{option.title}</div>
                  {option.render}
                </div>
              ))
            ) : (
              <div className="py-2 px-4 text-center text-muted-foreground">
                Nenhum resultado encontrado.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomizedSelect;
