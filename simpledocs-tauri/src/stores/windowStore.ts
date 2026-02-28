import { create } from "zustand";

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface WindowState {
    isExpanded: boolean;
    isDragging: boolean;
    corner: Corner;
    setExpanded: (v: boolean) => void;
    setDragging: (v: boolean) => void;
    setCorner: (c: Corner) => void;
    toggle: () => void;
}

export const useWindowStore = create<WindowState>((set, get) => ({
    isExpanded: false,
    isDragging: false,
    corner: "bottom-right",
    setExpanded: (v) => set({ isExpanded: v }),
    setDragging: (v) => set({ isDragging: v }),
    setCorner: (c) => set({ corner: c }),
    toggle: () => set({ isExpanded: !get().isExpanded }),
}));
