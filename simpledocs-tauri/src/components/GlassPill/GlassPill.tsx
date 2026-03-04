import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useWindow } from "../../hooks/useWindow";
import { useWindowStore } from "../../stores/windowStore";

const DRAG_THRESHOLD = 4;

export const GlassPill = () => {
    const { expand, startDrag } = useWindow();
    const { shouldClose, setShouldClose } = useWindowStore();
    const [isExiting, setIsExiting] = useState(false);

    const mouseStart = useRef<{ x: number; y: number } | null>(null);
    const didDrag = useRef(false);
    const dragStarted = useRef(false); // true after startDrag() was called

    // Watch shouldClose from store — fires when window-moved debounce detects drop on zone
    useEffect(() => {
        if (!shouldClose) return;
        setShouldClose(false);

        // Play exit animation then quit
        setIsExiting(true);
        setTimeout(async () => {
            await invoke("quit_app");
        }, 220);
    }, [shouldClose]);

    const handleMouseDown = (e: React.MouseEvent) => {
        mouseStart.current = { x: e.clientX, y: e.clientY };
        didDrag.current = false;
        dragStarted.current = false;

        const onMove = async (ev: MouseEvent) => {
            if (!mouseStart.current || dragStarted.current) return;
            const dx = ev.clientX - mouseStart.current.x;
            const dy = ev.clientY - mouseStart.current.y;
            if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
                dragStarted.current = true;
                didDrag.current = true;
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                // Hand off to OS — mouseup won't fire after this
                await startDrag();
            }
        };

        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            // Only reaches here if user released BEFORE drag threshold
            // i.e. it was a click, not a drag — do nothing (click handler fires)
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    };

    return (
        <AnimatePresence>
            {!isExiting && (
                <motion.div
                    key="pill-inner"
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
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.2 }}
                    transition={{ duration: 0.2, ease: "easeIn" }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onMouseDown={handleMouseDown}
                    onClick={() => {
                        if (!didDrag.current) {
                            expand();
                        }
                    }}
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
            )}
        </AnimatePresence>
    );
};
