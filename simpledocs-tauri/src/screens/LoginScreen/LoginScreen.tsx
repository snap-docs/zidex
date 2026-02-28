import { useState } from "react";
import { motion } from "framer-motion";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/glass.css";

const startWindowDrag = () => getCurrentWindow().startDragging();

export const LoginScreen = () => {
    const { login, signup } = useAuth();
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!email.trim() || !password.trim()) { setError("Email and password required"); return; }
        setLoading(true); setError("");
        try {
            mode === "login" ? await login(email, password) : await signup(email, password);
        } catch (e: any) {
            setError(e?.response?.data?.detail || e?.message || "Something went wrong");
        } finally { setLoading(false); }
    };

    return (
        <motion.div className="glass-card"
            style={{ width: 320, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10 }}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
            {/* Drag handle bar */}
            <div
                onMouseDown={startWindowDrag}
                style={{
                    width: "100%",
                    height: 24,
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

            <div>
                <div
                    onMouseDown={startWindowDrag}
                    style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, cursor: "grab" }}
                >
                    <span style={{ color: "#6366f1", fontSize: 14 }}>✦</span>
                    <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>
                        simpledocs.ai
                    </span>
                </div>
                <p style={{ color: "var(--text-dim)", fontSize: 11, marginLeft: 20 }}>Understand code instantly</p>
            </div>

            <input className="glass-input" type="email" placeholder="Email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

            <input className="glass-input" type="password" placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

            {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ color: "var(--color-error)", fontSize: 11, textAlign: "center" }}>
                    {error}
                </motion.p>
            )}

            <button className="glass-button" onClick={handleSubmit} disabled={loading}>
                {loading ? "..." : mode === "login" ? "Login" : "Sign Up"}
            </button>

            <button className="glass-button-ghost" style={{ border: "none", background: "transparent" }}
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
                {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
        </motion.div>
    );
};
