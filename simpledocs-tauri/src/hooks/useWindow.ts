import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useWindowStore, Corner } from "../stores/windowStore";
import { WIDGET_COLLAPSED_SIZE, WIDGET_EXPANDED_WIDTH, WIDGET_EXPANDED_HEIGHT } from "../utils/constants";

const CORNER_POSITIONS = (sw: number, sh: number): Record<Corner, [number, number]> => ({
    "top-left": [16, 16],
    "top-right": [sw - 68, 16],
    "bottom-left": [16, sh - 120],   // 52(widget) + 52(taskbar) + 16(pad)
    "bottom-right": [sw - 68, sh - 120],
});

export const useWindow = () => {
    const { isExpanded, setExpanded, setDragging, corner, setCorner } = useWindowStore();
    const appWindow = getCurrentWindow();

    // Smooth 10-step ease-out-cubic animation to target position
    const snapWithAnimation = async (targetX: number, targetY: number) => {
        const pos = await appWindow.outerPosition();
        const scale = await appWindow.scaleFactor();
        const startX = pos.x / scale;
        const startY = pos.y / scale;
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
            const ease = 1 - Math.pow(1 - i / steps, 3);
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

        const [targetX, targetY] = await invoke<[number, number]>("snap_to_corner", {
            widgetX: pos.x / scale,
            widgetY: pos.y / scale,
            widgetSize: WIDGET_COLLAPSED_SIZE,
        });

        // Detect which corner and persist it
        const [sw, sh] = await invoke<[number, number]>("get_screen_size");
        const positions = CORNER_POSITIONS(sw, sh);
        const detected = (Object.entries(positions) as [Corner, [number, number]][])
            .find(([, [cx, cy]]) => Math.abs(cx - targetX) < 2 && Math.abs(cy - targetY) < 2);
        if (detected) setCorner(detected[0]);

        await snapWithAnimation(targetX, targetY);
    };

    const expand = async () => {
        const pos = await appWindow.outerPosition();
        const scale = await appWindow.scaleFactor();
        const pillX = pos.x / scale;
        const pillY = pos.y / scale;

        // Move window so panel grows inward from the pill's corner
        const offsets: Record<Corner, [number, number]> = {
            "bottom-right": [pillX - (WIDGET_EXPANDED_WIDTH - WIDGET_COLLAPSED_SIZE), pillY - (WIDGET_EXPANDED_HEIGHT - WIDGET_COLLAPSED_SIZE)],
            "bottom-left": [pillX, pillY - (WIDGET_EXPANDED_HEIGHT - WIDGET_COLLAPSED_SIZE)],
            "top-right": [pillX - (WIDGET_EXPANDED_WIDTH - WIDGET_COLLAPSED_SIZE), pillY],
            "top-left": [pillX, pillY],
        };

        const [newX, newY] = offsets[corner] ?? offsets["bottom-right"];
        await invoke("set_window_position", { x: newX, y: newY });
        await appWindow.setSize(new LogicalSize(WIDGET_EXPANDED_WIDTH, WIDGET_EXPANDED_HEIGHT));
        setExpanded(true);
    };

    const collapse = async () => {
        setExpanded(false);
        await new Promise(r => setTimeout(r, 120)); // let exit animation play

        // Restore the exact corner position, then shrink
        const [sw, sh] = await invoke<[number, number]>("get_screen_size");
        const [x, y] = CORNER_POSITIONS(sw, sh)[corner];
        await invoke("set_window_position", { x, y });
        await appWindow.setSize(new LogicalSize(WIDGET_COLLAPSED_SIZE, WIDGET_COLLAPSED_SIZE));
    };

    const startDrag = () => {
        setDragging(true);
        appWindow.startDragging();
    };

    // Listen for window-moved events (emitted by main.rs on every OS move).
    // Debounce 150ms — when movement stops, snap to nearest corner.
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        let unlistenFn: (() => void) | null = null;

        appWindow.listen("window-moved", () => {
            // Only snap when in collapsed (pill) mode
            if (useWindowStore.getState().isExpanded) return;
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
