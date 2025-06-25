import { DnDContext, DnDId } from "@/components/DnDContextProvider";
import { useCallback, useContext, useEffect, useMemo, useRef } from "react";

type UseDroppableArgs = {
  id: DnDId;
};

type UseDroppableReturn = {
  setNodeRef: (node: HTMLElement | null) => void;
  isOver: boolean;
  order: number | null;
};

const INITIAL_HEIGHT = 0;

const useDroppable = ({ id }: UseDroppableArgs): UseDroppableReturn => {
  const setup = useRef(false);
  const droppableRef = useRef<HTMLElement | null>(null);
  const draggingNodeHeight = useRef(INITIAL_HEIGHT);
  const draggingNodeMargin = useRef(INITIAL_HEIGHT);
  const hoveringElement = useRef<HTMLElement | null>(null);
  const {
    addDroppable,
    isOver: OverObj,
    order,
    getDraggingNode,
    constants: { HOVER_ITEM_ID, DRAGGING_ITEM_ID },
  } = useContext(DnDContext);
  const isOver = useMemo(() => !!OverObj && OverObj == id, [id, OverObj]);

  const setDraggingNodeHeight = useCallback(() => {
    const draggingNode = getDraggingNode();
    if (!draggingNode) return INITIAL_HEIGHT;

    const originalDisplay = draggingNode?.style.display;
    draggingNode.style.display = "block";
    draggingNodeHeight.current = draggingNode.offsetHeight;
    draggingNode.style.display = originalDisplay;

    draggingNodeMargin.current =
      parseFloat(window.getComputedStyle(draggingNode).marginTop) +
      parseFloat(window.getComputedStyle(draggingNode).marginBottom);
  }, [getDraggingNode]);

  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      if (setup.current) return;
      setup.current = true;
      if (!node) return;

      addDroppable(id, node);
      droppableRef.current = node;
    },
    [addDroppable, id],
  );

  const clearHoverElement = useCallback(
    (parent: HTMLElement) => {
      const element = parent.querySelector(`#${HOVER_ITEM_ID}`);
      if (element) {
        element.remove();
      }
      draggingNodeHeight.current = INITIAL_HEIGHT;
      draggingNodeMargin.current = INITIAL_HEIGHT;
      hoveringElement.current = null;
    },
    [HOVER_ITEM_ID],
  );

  const clearHoverStyling = useCallback((children: HTMLElement[]) => {
    children.forEach((child) => {
      child.style.transform = `translateY(0px)`;
    });
  }, []);

  const addHoverElementToDom = useCallback(
    (parent: HTMLElement) => {
      if (hoveringElement.current || !getDraggingNode) return;
      const referenceNode = getDraggingNode();
      if (!referenceNode) return;

      const element = document.createElement("div");
      element.id = HOVER_ITEM_ID;
      element.style.height = `${draggingNodeHeight.current}px`;
      element.style.marginTop = `${draggingNodeMargin.current}px`;
      element.style.marginBottom = `${draggingNodeMargin.current}px`;
      element.style.borderRadius = "4px";
      element.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
      element.className = "virtual-hover-element";
      parent.appendChild(element);
      hoveringElement.current = element;
    },
    [getDraggingNode, draggingNodeHeight, HOVER_ITEM_ID],
  );

  useEffect(() => {
    if (!droppableRef.current) return;
    const children = Array.from(droppableRef.current?.children).filter(
      (child) => child.id !== DRAGGING_ITEM_ID && child.id !== HOVER_ITEM_ID,
    ) as HTMLElement[];
    clearHoverStyling(children);

    if (order === null || OverObj !== id) {
      clearHoverElement(droppableRef.current);
      return;
    }

    if (
      draggingNodeHeight.current === INITIAL_HEIGHT ||
      draggingNodeMargin.current === INITIAL_HEIGHT
    )
      setDraggingNodeHeight();

    addHoverElementToDom(droppableRef.current);
    const movement = draggingNodeHeight.current + draggingNodeMargin.current;
    let hoveringElementTransform = 0;
    children.forEach((child, index) => {
      if (index + 1 >= order) {
        child.style.transform = `translateY(${movement}px)`;
        hoveringElementTransform +=
          parseFloat(window.getComputedStyle(child).height) +
          parseFloat(window.getComputedStyle(child).marginBottom);
      }
    });
    hoveringElement.current!.style.transform = `translateY(-${hoveringElementTransform}px)`;
  }, [
    order,
    OverObj,
    id,
    clearHoverElement,
    clearHoverStyling,
    addHoverElementToDom,
    getDraggingNode,
    setDraggingNodeHeight,
    DRAGGING_ITEM_ID,
    HOVER_ITEM_ID,
    draggingNodeHeight,
  ]);

  return { setNodeRef, isOver, order };
};

export default useDroppable;
