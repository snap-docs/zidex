import api from "./api";
import { storage } from "../utils/storage";

export const authService = {
    login: async (d: { email: string; password: string }) => (await api.post("/auth/login", d)).data,
    signup: async (d: { email: string; password: string }) => (await api.post("/auth/signup", d)).data,
    logout: async () => { try { await api.post("/auth/logout"); } finally { storage.clear(); } },
    getMe: async () => (await api.get("/auth/me")).data,

    // ── Google OAuth ──────────────────────────────────────────────────────────
    getGoogleAuthUrl: async (): Promise<{ url: string; session_id: string }> =>
        (await api.get("/auth/google")).data,

    pollGoogleStatus: async (sessionId: string): Promise<{
        status: "pending" | "ok";
        access_token?: string;
        user?: { id: string; email: string; is_pro: boolean };
    }> => (await api.get(`/auth/google/status?session_id=${sessionId}`)).data,
};
