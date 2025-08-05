export enum SideBarActionType {
  OPEN_SIDEBAR = "OPEN_SIDEBAR",
  CLOSE_SIDEBAR = "CLOSE_SIDEBAR",
  TOGGLE_SIDEBAR = "TOGGLE_SIDEBAR",
}

export interface CloseSidebarI {
  type: SideBarActionType.CLOSE_SIDEBAR;
  payload: null;
}

export interface OpenSidebarI {
  type: SideBarActionType.OPEN_SIDEBAR;
  payload: null;
}

export interface ToggleSidebarI {
  type: SideBarActionType.TOGGLE_SIDEBAR;
  payload: null;
}

export const toggleSidebar = (): ToggleSidebarI => {
  return {
    type: SideBarActionType.TOGGLE_SIDEBAR,
    payload: null,
  };
};

export const openSidebar = (): OpenSidebarI => {
  return {
    type: SideBarActionType.OPEN_SIDEBAR,
    payload: null,
  };
};

export const closeSidebar = (): CloseSidebarI => {
  return {
    type: SideBarActionType.CLOSE_SIDEBAR,
    payload: null,
  };
};

export type TodoEditorAction = OpenSidebarI | CloseSidebarI | ToggleSidebarI;
