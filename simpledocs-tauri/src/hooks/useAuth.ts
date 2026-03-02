import { useAuthStore } from "../stores/authStore";
import { authService } from "../services/authService";
import { open } from "@tauri-apps/plugin-shell";

export const useAuth = () => {
    const { user, isLoggedIn, isGoogleLoading, setAuth, clearAuth, setGoogleLoading } = useAuthStore();

    const login = async (email: string, password: string) => {
        const r = await authService.login({ email, password });
        setAuth(r.access_token, r.user);
        return r;
    };

    const signup = async (email: string, password: string) => {
        const r = await authService.signup({ email, password });
        setAuth(r.access_token, r.user);
        return r;
    };

    const logout = async () => { await authService.logout(); clearAuth(); };

    const loginWithGoogle = async () => {
        setGoogleLoading(true);
        try {
            // 1. Get OAuth URL + session ID from backend
            const { url, session_id } = await authService.getGoogleAuthUrl();

            // 2. Open Google consent page in system browser
            await open(url);

            // 3. Poll backend every 2s until token arrives (max 3 min)
            const MAX_POLLS = 90;
            for (let i = 0; i < MAX_POLLS; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const result = await authService.pollGoogleStatus(session_id);
                if (result.status === "ok" && result.access_token && result.user) {
                    setAuth(result.access_token, result.user);
                    return; // ✅ logged in
                }
            }

            throw new Error("Google login timed out. Please try again.");
        } finally {
            setGoogleLoading(false);
        }
    };

    return { user, isLoggedIn, isGoogleLoading, login, signup, logout, loginWithGoogle };
};
