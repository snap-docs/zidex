import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAuthStore } from "./stores/authStore";
import { useWindowStore } from "./stores/windowStore";
import { useExplain } from "./hooks/useExplain";
import { useWindow } from "./hooks/useWindow";
import { GlassPill } from "./components/GlassPill/GlassPill";
import { CloseZone } from "./components/CloseZone/CloseZone";
import { LoginScreen } from "./screens/LoginScreen/LoginScreen";
import { ResultScreen } from "./screens/ResultScreen/ResultScreen";
import { WIDGET_COLLAPSED_SIZE, WIDGET_EXPANDED_WIDTH, WIDGET_EXPANDED_HEIGHT } from "./utils/constants";
import "./styles/globals.css";
import "./styles/glass.css";

export default function App() {
    const { isLoggedIn } = useAuthStore();
    const { isExpanded } = useWindowStore();
    const { triggerExplain } = useExplain();
    const { expand } = useWindow();

    // Handle global hotkey explain event
    useEffect(() => {
        const unlisten = listen("trigger-explain", async () => {
            if (!isLoggedIn) { await expand(); return; }
            if (!isExpanded) await expand();
            await triggerExplain();
        });
        return () => { unlisten.then((f) => f()); };
    }, [isLoggedIn, isExpanded]);

    const W = isExpanded ? WIDGET_EXPANDED_WIDTH : WIDGET_COLLAPSED_SIZE;
    const H = isExpanded ? WIDGET_EXPANDED_HEIGHT : WIDGET_COLLAPSED_SIZE;

    return (
        <>
            {/* Close zone — always in DOM, visible only during pill drag */}
            {!isExpanded && <CloseZone />}

            <div style={{
                width: W,
                height: H,
                background: "transparent",
                overflow: "hidden",
                position: "relative",
            }}>
                <AnimatePresence mode="wait">
                    {!isExpanded ? (
                        <motion.div
                            key="pill"
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            style={{ width: 52, height: 52 }}
                        >
                            <GlassPill />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            style={{ width: W, height: H }}
                        >
                            <AnimatePresence mode="wait">
                                {isLoggedIn
                                    ? <ResultScreen key="result" />
                                    : <LoginScreen key="login" />
                                }
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
