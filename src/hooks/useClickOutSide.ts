import { RefObject, useEffect } from "react";

const useClickOutSide = (ref: RefObject<HTMLElement>, callback: () => void) => {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);
};

export default useClickOutSide;
