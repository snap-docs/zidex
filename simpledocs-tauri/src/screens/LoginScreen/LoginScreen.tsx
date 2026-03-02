import { useState } from "react";
import { motion } from "framer-motion";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/glass.css";

const startWindowDrag = async () => { await getCurrentWindow().startDragging(); };

export const LoginScreen = () => {
    const { login, signup, loginWithGoogle, isGoogleLoading } = useAuth();
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

    const handleGoogle = async () => {
        setError("");
        try {
            await loginWithGoogle();
        } catch (e: any) {
            setError(e?.message || "Google login failed");
        }
    };

    return (
        <motion.div className="glass-card"
            style={{ width: 320, height: 280, padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
            {/* Drag handle bar */}
            <div
                onMouseDown={startWindowDrag}
                style={{ width: "100%", height: 24, cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: -4, flexShrink: 0 }}
            >
                <div style={{ width: 32, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
            </div>

            <div>
                <div onMouseDown={startWindowDrag} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, cursor: "grab" }}>
                    <span style={{ color: "#6366f1", fontSize: 14 }}>✦</span>
                    <span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>simpledocs.ai</span>
                </div>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginLeft: 20 }}>Understand code instantly</p>
            </div>

            <input className="glass-input" type="email" placeholder="Email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

            <input className="glass-input" type="password" placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

            {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ color: "#f87171", fontSize: 11, textAlign: "center", margin: "-4px 0" }}>
                    {error}
                </motion.p>
            )}

            <button className="glass-button" onClick={handleSubmit} disabled={loading || isGoogleLoading}>
                {loading ? "..." : mode === "login" ? "Login" : "Sign Up"}
            </button>

            {/* Google OAuth button */}
            <button
                onClick={handleGoogle}
                disabled={loading || isGoogleLoading}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    height: 42,
                    background: isGoogleLoading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10,
                    color: "#f8fafc",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: loading || isGoogleLoading ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                    opacity: loading || isGoogleLoading ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!loading && !isGoogleLoading) (e.target as HTMLElement).style.background = "rgba(255,255,255,0.12)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = isGoogleLoading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)"; }}
            >
                {isGoogleLoading ? (
                    <span>Waiting for Google…</span>
                ) : (
                    <>
                        {/* Google G icon */}
                        <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        Continue with Google
                    </>
                )}
            </button>

            <button className="glass-button-ghost" style={{ border: "none", background: "transparent" }}
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
                {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
        </motion.div>
    );
};
