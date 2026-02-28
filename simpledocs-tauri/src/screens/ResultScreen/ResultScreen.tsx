import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAuth } from "../../hooks/useAuth";
import { useExplanationStore } from "../../stores/explanationStore";
import { useWindow } from "../../hooks/useWindow";
import "../../styles/glass.css";

const startWindowDrag = () => getCurrentWindow().startDragging();

const CASE_COLORS: Record<string, string> = {
    code: "#22d3ee", error: "#f87171", other: "#a3a3a3"
};
const CASE_LABELS: Record<string, string> = {
    code: "✦ Code", error: "⚠ Error", other: "◎ Text"
};

export const ResultScreen = () => {
    const { logout } = useAuth();
    const { collapse } = useWindow();
    const { result, quota, isLoading, error, status } = useExplanationStore();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (result?.explanation) {
            navigator.clipboard.writeText(result.explanation);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    const caseColor = result ? CASE_COLORS[result.case_type] || "#a3a3a3" : "var(--text-dim)";
    const caseLabel = result ? CASE_LABELS[result.case_type] || "◎ Text" : null;

    return (
        <motion.div className="glass-card"
            style={{ width: 320, height: 220, display: "flex", flexDirection: "column", padding: "12px 14px", gap: 8 }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
            {/* Drag handle */}
            <div
                onMouseDown={startWindowDrag}
                style={{
                    width: "100%",
                    height: 20,
                    cursor: "grab",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: -4,
                    flexShrink: 0,
                }}
            >
                <div style={{ width: 32, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
            </div>

            {/* Header */}
            <div
                onMouseDown={startWindowDrag}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "grab" }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#6366f1", fontSize: 12 }}>✦</span>
                    <span style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600 }}>simpledocs.ai</span>
                </div>
                <button className="glass-button-ghost" onClick={collapse} style={{ fontSize: 12, padding: "3px 7px" }}>↙</button>
            </div>

            {/* Status */}
            <AnimatePresence mode="wait">
                <motion.p key={caseLabel || status}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    style={{ fontSize: 10, color: result ? caseColor : "var(--text-dim)", fontWeight: 500 }}>
                    {result ? caseLabel : isLoading ? `◌ ${status}` : `◎ ${status}`}
                </motion.p>
            </AnimatePresence>

            {/* Content area */}
            <div style={{
                flex: 1, overflow: "hidden",
                display: "flex",
                alignItems: isLoading ? "center" : "flex-start",
                justifyContent: isLoading ? "center" : "flex-start",
            }}>
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ display: "flex", gap: 5 }}>
                            {[0, 1, 2].map((i) => (
                                <motion.div key={i}
                                    style={{ width: 5, height: 5, borderRadius: "50%", background: "#6366f1" }}
                                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                            ))}
                        </motion.div>
                    ) : error ? (
                        <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ color: "var(--color-error)", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-line" }}>
                            {error}
                        </motion.p>
                    ) : result ? (
                        <motion.p key="result" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            style={{
                                color: "var(--text-primary)", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-line",
                                fontFamily: result.case_type === "code" ? "'DM Mono', monospace" : "'DM Sans', sans-serif"
                            }}>
                            {result.explanation}
                        </motion.p>
                    ) : (
                        <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ color: "var(--text-dim)", fontSize: 11, textAlign: "center", width: "100%", paddingTop: 8 }}>
                            Select anything and press Ctrl+Space
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 7
            }}>
                <span style={{ color: "var(--text-dim)", fontSize: 10 }}>
                    {quota ? `${quota.remaining}/${quota.limit} today` : "30/30 today"}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                    {result && (
                        <button className="glass-button-ghost" onClick={handleCopy} style={{ fontSize: 10, padding: "3px 8px" }}>
                            {copied ? "✓" : "Copy"}
                        </button>
                    )}
                    <button className="glass-button-ghost" onClick={logout} style={{ fontSize: 10, padding: "3px 8px" }}>
                        Logout
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
