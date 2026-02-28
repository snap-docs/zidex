import { useRef } from "react";
import { motion } from "framer-motion";
import { useWindow } from "../../hooks/useWindow";

const DRAG_THRESHOLD = 4; // px before committing to drag

export const GlassPill = () => {
    const { expand } = useWindow();

    const mouseStart = useRef<{ x: number; y: number } | null>(null);
    const didDrag = useRef(false);

    const handleMouseDown = async (e: React.MouseEvent) => {
        mouseStart.current = { x: e.clientX, y: e.clientY };
        didDrag.current = false;

        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();

        const onMove = (ev: MouseEvent) => {
            if (!mouseStart.current || didDrag.current) return;
            const dx = ev.clientX - mouseStart.current.x;
            const dy = ev.clientY - mouseStart.current.y;
            if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
                didDrag.current = true;
                // Hand off to OS — snap happens via window-moved event in useWindow
                appWindow.startDragging();
            }
        };

        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            // Snap is handled by the window-moved debounce in useWindow.ts
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    };

    return (
        <motion.div
            className="glass-pill"
            style={{
                width: 52,
                height: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "rgba(15, 15, 15, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "50%",
                flexShrink: 0,
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onMouseDown={handleMouseDown}
            onClick={() => {
                if (!didDrag.current) {
                    expand();
                }
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
            <motion.span
                style={{
                    fontSize: 22,
                    color: "#6366f1",
                    lineHeight: 1,
                    display: "block",
                    userSelect: "none",
                    pointerEvents: "none",
                }}
                animate={{
                    textShadow: [
                        "0 0 8px rgba(99,102,241,0.4)",
                        "0 0 22px rgba(99,102,241,0.9)",
                        "0 0 8px rgba(99,102,241,0.4)",
                    ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
                ✦
            </motion.span>
        </motion.div>
    );
};
