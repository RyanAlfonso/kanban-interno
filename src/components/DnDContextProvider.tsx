import useForceUpdate from "@/hooks/useForceUpdate";
import {
  FC,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type DnDId = string | number;

export type OnDragEndEvent = {
  over: DnDId | null;
  from: DnDId | null;
  item: DnDId | null;
  order: number;
};

type DndContextProps = {
  children: React.ReactNode;
  onDragEnd?: (e: OnDragEndEvent) => void;
  onDragging?: (e: DndMouseEvent) => void;
};

type DroppableMap = {
  [key: DnDId]: {
    node: HTMLElement;
  };
};

type DndMouseEvent = MouseEvent | React.MouseEvent<HTMLDivElement>;

type DndContext = {
  isDragging: boolean;
  isOver: DnDId | null;
  order: number | null;
  handleDragStart: (
    e: DndMouseEvent,
    id: DnDId,
    draggingNode: HTMLElement,
  ) => void;
  handleDragging: (e: DndMouseEvent) => void;
  handleDragEnd: (e: DndMouseEvent) => void;
  addDroppable: (id: DnDId, node: HTMLElement) => void;
  removeDroppable: (id: DnDId) => void;
  getDraggingNode: () => HTMLElement | null;
  constants: Record<string | number, string>;
};

const initialState = {
  isDragging: false,
  isOver: null,
  order: 0,
  handleDragStart: (
    e: DndMouseEvent,
    id: DnDId,
    draggingNode: HTMLElement,
  ) => {},
  handleDragging: (e: DndMouseEvent) => {},
  handleDragEnd: (e: DndMouseEvent) => {},
  addDroppable: (id: DnDId, node: HTMLElement) => {},
  removeDroppable: (id: DnDId) => {},
  getDraggingNode: () => null,
  constants: {},
};

export const DnDContext = createContext<DndContext>(initialState);

const DndContextProvider: FC<DndContextProps> = ({
  children,
  onDragEnd,
  onDragging,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const isOver = useRef<DnDId | null>(null);
  const order = useRef<number | null>(null);
  const start = useRef<DnDId | null>(null);
  const droppableRef = useRef<DroppableMap | null>(null);
  const draggingNodeId = useRef<DnDId | null>(null);
  const draggingNode = useRef<HTMLElement | null>(null);
  const prevMouseMoveEvent = useRef<DndMouseEvent | null>(null);
  const forceUpdate = useForceUpdate();
  const constants = useMemo(
    () => ({
      DRAGGING_ITEM_ID: "dnd-dragging-id",
      HOVER_ITEM_ID: "dnd-hover-id",
    }),
    [],
  );

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isDragging && onDragging) {
      intervalId = setInterval(() => {
        if (!prevMouseMoveEvent.current) return;
        onDragging(prevMouseMoveEvent.current);
      }, 100);
    }
    return () => {
      clearInterval(intervalId);
    };
  }, [isDragging, onDragging]);

  const reset = useCallback(() => {
    setIsDragging(false);
    isOver.current = null;
    start.current = null;
    draggingNodeId.current = null;
  }, []);

  const registerDragging = useCallback((id: DnDId, node: HTMLElement) => {
    if (!node) return;
    draggingNode.current = node;
    draggingNodeId.current = id;
  }, []);

  const addDroppable = useCallback((id: DnDId, node: HTMLElement) => {
    droppableRef.current = {
      ...droppableRef.current,
      [id]: { node },
    };
  }, []);

  const removeDroppable = (id: DnDId) => {
    if (!droppableRef.current) return;
    delete droppableRef.current[id];
  };

  const checkDroppableCollision = useCallback((e: DndMouseEvent) => {
    let maxId: DnDId | null = null;
    for (const id in droppableRef.current) {
      const { node } = droppableRef.current[id];
      const rect = node.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        maxId = id;
      }
    }
    return maxId;
  }, []);

  const calculateOrder = useCallback(
    (e: DndMouseEvent, isOver: string | null) => {
      if (!isOver || !droppableRef.current) return null;
      const { node } = droppableRef.current[isOver];
      if (!node.children || node.children.length === 0) return 1;

      let closest = Infinity;
      let closestIndex: null | number = null;
      const remainingChildren = Array.from(node.children).filter(
        (child) =>
          child.id !== constants.DRAGGING_ITEM_ID &&
          child.id !== constants.HOVER_ITEM_ID,
      );
      if (remainingChildren.length === 0) return 1;
      remainingChildren.forEach((child, index) => {
        const rect = (child as HTMLElement).getBoundingClientRect();
        const top = rect.top;
        if (Math.abs(top - e.clientY) < closest) {
          closest = Math.abs(top - e.clientY);
          closestIndex = index + 1;
        }
      });

      const lastChild = remainingChildren[
        remainingChildren.length - 1
      ] as HTMLElement;
      const lastRect = lastChild.getBoundingClientRect();
      if (Math.abs(lastRect.bottom - e.clientY) < closest) {
        closestIndex = remainingChildren.length + 1;
      }
      return closestIndex;
    },
    [],
  );

  const handleDragStart = useCallback(
    (e: DndMouseEvent, id: DnDId, draggingNode: HTMLElement) => {
      setIsDragging(true);
      start.current = checkDroppableCollision(e);
      registerDragging(id, draggingNode);
    },
    [checkDroppableCollision, registerDragging],
  );

  const handleDragging = useCallback(
    (e: DndMouseEvent) => {
      prevMouseMoveEvent.current = e;
      const _isOver = checkDroppableCollision(e);
      const _order = calculateOrder(e, _isOver);
      if (
        _isOver !== isOver.current ||
        (_order !== order.current && !!_order)
      ) {
        isOver.current = _isOver;
        order.current = _order;
        forceUpdate();
      }
    },
    [checkDroppableCollision, calculateOrder],
  );

  const handleDragEnd = useCallback(
    (e: DndMouseEvent) => {
      if (!onDragEnd) return;

      const result = {
        over: isOver.current,
        from: start.current,
        item: draggingNodeId.current,
        order: order.current || 0,
      };

      onDragEnd(result);
      reset();
    },
    [onDragEnd, reset],
  );

  const getDraggingNode = useCallback(() => {
    return draggingNode.current;
  }, []);

  const value: DndContext = {
    isDragging,
    isOver: isOver.current,
    order: order.current,
    handleDragStart,
    handleDragging,
    handleDragEnd,
    addDroppable,
    removeDroppable,
    getDraggingNode,
    constants,
  };

  return <DnDContext.Provider value={value}>{children}</DnDContext.Provider>;
};

export default DndContextProvider;
