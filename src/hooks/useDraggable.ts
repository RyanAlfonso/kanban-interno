import { DnDContext, DnDId } from "@/components/DnDContextProvider";
import {
  HtmlHTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type UseDraggableArgs = {
  id: DnDId;
  handleClick?: (e: MouseEvent) => void;
  handleDragging?: (e: MouseEvent | React.MouseEvent<HTMLDivElement>) => void;
};

type Attributes = Partial<HtmlHTMLAttributes<HTMLDivElement>>;

type UseDraggableReturn = {
  setNodeRef: (node: HTMLElement | null) => void;
  attributes: Attributes;
  isDragging: boolean;
};

const DRAGGED_THRESHOLD = 5;

const useDraggable = ({
  id,
  handleClick,
  handleDragging,
}: UseDraggableArgs): UseDraggableReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const [adjustment, setAdjustment] = useState({ x: 0, y: 0 });
  const {
    handleDragStart,
    handleDragging: _handleDragging,
    handleDragEnd,
    constants: { DRAGGING_ITEM_ID },
  } = useContext(DnDContext);
  const isDragged = useRef(false);
  const originalPos = useRef({ x: 0, y: 0 });
  const originalMousePos = useRef({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLElement | null>(null);
  const setup = useRef(false);
  const prevMouseMoveEvent = useRef<MouseEvent | null>(null);
  const clonedNode = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isDragging && handleDragging) {
      intervalId = setInterval(() => {
        if (!prevMouseMoveEvent.current) return;
        handleDragging(prevMouseMoveEvent.current);
      }, 100);
    }
    return () => {
      clearInterval(intervalId);
    };
  }, [isDragging, handleDragging]);

  const reset = useCallback(() => {
    setIsDragging(false);
    setAdjustment({ x: 0, y: 0 });
    isDragged.current = false;
    if (!clonedNode.current || !clonedNode.current.parentElement) return;
    clonedNode.current.parentElement.removeChild(clonedNode.current);
  }, []);

  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);

    const rect = nodeRef.current!.getBoundingClientRect();
    setAdjustment({
      x: e.clientX - rect.x,
      y: e.clientY - rect.y,
    });

    originalMousePos.current = { x: e.clientX, y: e.clientY };

    const originalRect = nodeRef.current?.getBoundingClientRect()!;
    const originalX = originalRect.x;
    const originalY = originalRect.y;
    originalPos.current = { x: originalX, y: originalY };
  };

  const initialClonedNode = useCallback(
    (
      nodeForClone: HTMLElement,
      originalX: number,
      originalY: number,
      width: number,
      height: number,
    ) => {
      clonedNode.current = nodeForClone.cloneNode(true) as HTMLElement;
      document.body.appendChild(clonedNode.current);
      clonedNode.current.style.position = "absolute";
      clonedNode.current.style.top = `${originalY}px`;
      clonedNode.current.style.left = `${originalX}px`;
      clonedNode.current.style.width = `${width}px`;
      clonedNode.current.style.height = `${height}px`;
      clonedNode.current.style.outline = "none";
      clonedNode.current.style.boxShadow = "0 0 10px 0 hsl(var(--secondary))";
    },
    [],
  );

  const moveClonedNode = useCallback(
    (clonedNode: HTMLElement | null, x: number, y: number) => {
      if (!clonedNode) return;
      clonedNode.style.transform = `translate(${x}px, ${y}px)`;
    },
    [],
  );

  const setNodeRef = useCallback((node: HTMLElement | null) => {
    if (setup.current) return;
    setup.current = true;
    if (!node) return;

    nodeRef.current = node;
  }, []);

  const initialDrag = useCallback(
    (e: MouseEvent) => {
      handleDragStart(e, id, nodeRef.current!);
      _handleDragging(e);
      isDragged.current = true;
      initialClonedNode(
        nodeRef.current!,
        originalPos.current.x,
        originalPos.current.y,
        nodeRef.current!.clientWidth,
        nodeRef.current!.clientHeight,
      );
    },
    [_handleDragging, handleDragStart, id, initialClonedNode],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      moveClonedNode(
        clonedNode.current,
        e.clientX - adjustment.x - originalPos.current.x,
        e.clientY - adjustment.y - originalPos.current.y,
      );
      prevMouseMoveEvent.current = e;

      if (isDragged.current) {
        _handleDragging(e);
        return;
      }

      const diffX = Math.abs(e.clientX - originalMousePos.current.x);
      const diffY = Math.abs(e.clientY - originalMousePos.current.y);
      if (diffX > DRAGGED_THRESHOLD || diffY > DRAGGED_THRESHOLD) {
        initialDrag(e);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      handleDragEnd(e);
      !isDragged.current && handleClick && handleClick(e);
      reset();
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    handleDragEnd,
    handleDragging,
    reset,
    handleClick,
    moveClonedNode,
    adjustment.x,
    adjustment.y,
    initialDrag,
  ]);

  const attributes: Attributes = {
    onMouseDown: onMouseDown,
    style: {
      outline: isDragging ? "2px solid hsl(var(--secondary))" : "none",
      position: "relative",
      display: isDragged.current ? "none" : "block",
    },
    id: isDragging ? DRAGGING_ITEM_ID : undefined,
  };

  return {
    setNodeRef,
    attributes,
    isDragging: isDragging,
  };
};

export default useDraggable;
