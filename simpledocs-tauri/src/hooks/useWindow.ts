import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useWindowStore, Corner } from "../stores/windowStore";

const PAD = 16;
const TASKBAR = 52;
const PW = 52; const PH = 52;   // pill dimensions
const EW = 320; const EH = 280;  // expanded panel dimensions

// Absolute corner positions for collapsed pill (52x52)
const pillCorners = (sw: number, sh: number): Record<Corner, [number, number]> => ({
    "top-left": [PAD, PAD],
    "top-right": [sw - PW - PAD, PAD],
    "bottom-left": [PAD, sh - PH - TASKBAR],
    "bottom-right": [sw - PW - PAD, sh - PH - TASKBAR],
});

// Absolute corner positions for expanded panel (320x280)
const expandedCorners = (sw: number, sh: number): Record<Corner, [number, number]> => ({
    "top-left": [PAD, PAD],
    "top-right": [sw - EW - PAD, PAD],
    "bottom-left": [PAD, sh - EH - TASKBAR],
    "bottom-right": [sw - EW - PAD, sh - EH - TASKBAR],
});

// Suppress window-moved snap during programmatic resize/move
let isDragSnapBlocked = false;

export const useWindow = () => {
    const { isExpanded, setExpanded, setDragging, corner, setCorner } = useWindowStore();
    const appWindow = getCurrentWindow();

    // Smooth 10-step ease-out-cubic animation
    const snapWithAnimation = async (targetX: number, targetY: number) => {
        const pos = await appWindow.outerPosition();
        const scale = await appWindow.scaleFactor();
        const startX = pos.x / scale;
        const startY = pos.y / scale;
        for (let i = 1; i <= 10; i++) {
            const ease = 1 - Math.pow(1 - i / 10, 3);
            await invoke("set_window_position", {
                x: startX + (targetX - startX) * ease,
                y: startY + (targetY - startY) * ease,
            });
            await new Promise(r => setTimeout(r, 12));
        }
    };

    const snapToNearestCorner = async () => {
        const pos = await appWindow.outerPosition();
        const scale = await appWindow.scaleFactor();
        const sz = await appWindow.outerSize();
        const ww = sz.width / scale;
        const wh = sz.height / scale;

        // Pass actual dimensions so Rust calculates the correct corner
        const [targetX, targetY] = await invoke<[number, number]>("snap_to_corner", {
            widgetX: pos.x / scale,
            widgetY: pos.y / scale,
            widgetW: ww,
            widgetH: wh,
        });

        // Persist which corner we landed in
        const [sw, sh] = await invoke<[number, number]>("get_screen_size");
        const isExpNow = useWindowStore.getState().isExpanded;
        const positions = isExpNow ? expandedCorners(sw, sh) : pillCorners(sw, sh);
        const detected = (Object.entries(positions) as [Corner, [number, number]][])
            .find(([, [cx, cy]]) => Math.abs(cx - targetX) < 4 && Math.abs(cy - targetY) < 4);
        if (detected) setCorner(detected[0]);

        await snapWithAnimation(targetX, targetY);
    };

    const expand = async () => {
        const [sw, sh] = await invoke<[number, number]>("get_screen_size");
        const c = useWindowStore.getState().corner;
        const [newX, newY] = expandedCorners(sw, sh)[c];

        isDragSnapBlocked = true;
        // Move to correct position FIRST, then resize — prevents off-screen flash
        await invoke("set_window_position", { x: newX, y: newY });
        await appWindow.setSize(new LogicalSize(EW, EH));
        setExpanded(true);
        setTimeout(() => { isDragSnapBlocked = false; }, 600);
    };

    const collapse = async () => {
        setExpanded(false);
        await new Promise(r => setTimeout(r, 120)); // let exit animation play

        const [sw, sh] = await invoke<[number, number]>("get_screen_size");
        const c = useWindowStore.getState().corner;
        const [x, y] = pillCorners(sw, sh)[c];

        isDragSnapBlocked = true;
        // Shrink FIRST so pill lands at correct position, not expanded-panel position
        await appWindow.setSize(new LogicalSize(PW, PH));
        await invoke("set_window_position", { x, y });
        setTimeout(() => { isDragSnapBlocked = false; }, 600);
    };

    const startDrag = async () => {
        setDragging(true);
        await appWindow.startDragging();
    };

    // Listen for window-moved (emitted by main.rs on every OS Moved event).
    // Debounces 150ms — snaps after drag stops. Works for both pill and popup.
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        let unlistenFn: (() => void) | null = null;

        appWindow.listen("window-moved", () => {
            if (isDragSnapBlocked) return;
            clearTimeout(timer);
            timer = setTimeout(async () => {
                setDragging(false);
                await snapToNearestCorner();
            }, 150);
        }).then(fn => { unlistenFn = fn; });

        return () => {
            clearTimeout(timer);
            unlistenFn?.();
        };
    }, []);

    return { isExpanded, expand, collapse, startDrag, snapToNearestCorner };
};
