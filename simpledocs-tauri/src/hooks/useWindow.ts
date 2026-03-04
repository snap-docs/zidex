import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useWindowStore, Corner } from "../stores/windowStore";

const PAD = 16;
const TASKBAR = 52;
const PW = 52; const PH = 52;
const EW = 320; const EH = 280;

// Distance threshold (px) for close zone overlap
const CLOSE_ZONE_RADIUS = 80;

const pillCorners = (sw: number, sh: number): Record<Corner, [number, number]> => ({
    "top-left": [PAD, PAD],
    "top-right": [sw - PW - PAD, PAD],
    "bottom-left": [PAD, sh - PH - TASKBAR],
    "bottom-right": [sw - PW - PAD, sh - PH - TASKBAR],
});

const expandedCorners = (sw: number, sh: number): Record<Corner, [number, number]> => ({
    "top-left": [PAD, PAD],
    "top-right": [sw - EW - PAD, PAD],
    "bottom-left": [PAD, sh - EH - TASKBAR],
    "bottom-right": [sw - EW - PAD, sh - EH - TASKBAR],
});

let isDragSnapBlocked = false;
let _pollInterval: ReturnType<typeof setInterval> | null = null;

export const useWindow = () => {
    const {
        isExpanded, setExpanded, setDragging, setOverCloseZone,
        setShouldClose, corner, setCorner
    } = useWindowStore();
    const appWindow = getCurrentWindow();

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

        const [targetX, targetY] = await invoke<[number, number]>("snap_to_corner", {
            widgetX: pos.x / scale,
            widgetY: pos.y / scale,
            widgetW: ww,
            widgetH: wh,
        });

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
        await invoke("set_window_position", { x: newX, y: newY });
        await appWindow.setSize(new LogicalSize(EW, EH));
        setExpanded(true);
        setTimeout(() => { isDragSnapBlocked = false; }, 600);
    };

    const collapse = async () => {
        setExpanded(false);
        await new Promise(r => setTimeout(r, 120));

        const [sw, sh] = await invoke<[number, number]>("get_screen_size");
        const c = useWindowStore.getState().corner;
        const [x, y] = pillCorners(sw, sh)[c];

        isDragSnapBlocked = true;
        await appWindow.setSize(new LogicalSize(PW, PH));
        await invoke("set_window_position", { x, y });
        setTimeout(() => { isDragSnapBlocked = false; }, 600);
    };

    /**
     * startDrag — called by GlassPill once drag threshold is crossed.
     * Hands off to OS AND starts polling every 50ms.
     * Drag END is detected by the window-moved debounce (150ms silence = released).
     */
    const startDrag = async () => {
        setDragging(true);
        setShouldClose(false);
        setOverCloseZone(false);

        // Get close zone center once
        const [sw, sh] = await invoke<[number, number]>("get_screen_size");
        const zoneX = sw / 2;
        const zoneY = sh - 70 - 28; // 28 = half of 56px zone height

        // Start position polling
        if (_pollInterval) clearInterval(_pollInterval);
        _pollInterval = setInterval(async () => {
            try {
                const [cx, cy] = await invoke<[number, number]>("get_window_center");
                const dist = Math.hypot(cx - zoneX, cy - zoneY);
                useWindowStore.getState().setOverCloseZone(dist < CLOSE_ZONE_RADIUS);
            } catch { /* window moving */ }
        }, 50);

        // Hand off to OS — after this, JS mouseup will NOT fire
        await appWindow.startDragging();
    };

    // window-moved fires for every OS-level drag move.
    // 150ms silence = user released. This is where we decide: close or snap.
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        let unlistenFn: (() => void) | null = null;

        appWindow.listen("window-moved", () => {
            if (isDragSnapBlocked) return;
            clearTimeout(timer);
            timer = setTimeout(async () => {
                // ── Drag has ended (150ms silence) ──
                const state = useWindowStore.getState();
                if (!state.isDragging) return; // wasn't a user drag

                // Stop the close-zone poll
                if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }

                const isOver = state.isOverCloseZone;
                setOverCloseZone(false);
                setDragging(false);

                if (isOver) {
                    // Signal GlassPill to play exit animation then quit
                    setShouldClose(true);
                } else {
                    await snapToNearestCorner();
                }
            }, 150);
        }).then(fn => { unlistenFn = fn; });

        return () => {
            clearTimeout(timer);
            unlistenFn?.();
        };
    }, []);

    return { isExpanded, expand, collapse, startDrag, snapToNearestCorner };
};
