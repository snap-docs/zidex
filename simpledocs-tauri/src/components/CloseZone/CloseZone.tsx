import { motion, AnimatePresence } from "framer-motion";
import { useWindowStore } from "../../stores/windowStore";

/**
 * CloseZone — red X target that appears at bottom-center when the pill is being dragged.
 * Grows and glows red when the widget center is within 80px of the zone center.
 * The parent (GlassPill via useWindow) handles detecting overlap and setting isOverCloseZone.
 */
export const CloseZone = () => {
    const { isDragging, isOverCloseZone } = useWindowStore();

    return (
        <AnimatePresence>
            {isDragging && (
                <motion.div
                    key="close-zone"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{
                        position: "fixed",
                        bottom: 70,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 9999,
                        pointerEvents: "none",
                    }}
                >
                    <motion.div
                        animate={isOverCloseZone ? {
                            width: 68,
                            height: 68,
                            background: "rgba(220, 38, 38, 0.7)",
                            border: "1px solid rgba(255, 100, 100, 0.4)",
                            boxShadow: "0 0 24px rgba(220, 38, 38, 0.5)",
                            scale: 1.2,
                        } : {
                            width: 56,
                            height: 56,
                            background: "rgba(0, 0, 0, 0.5)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            boxShadow: "none",
                            scale: 1,
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 30, duration: 0.15 }}
                        style={{
                            borderRadius: "50%",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "default",
                        }}
                    >
                        <motion.span
                            animate={isOverCloseZone
                                ? { color: "#ffffff", fontSize: "20px" }
                                : { color: "rgba(255,255,255,0.6)", fontSize: "18px" }
                            }
                            transition={{ duration: 0.15 }}
                            style={{ userSelect: "none", lineHeight: 1 }}
                        >
                            ✕
                        </motion.span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
