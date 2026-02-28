import { create } from "zustand";
import { storage } from "../utils/storage";

interface User { id: string; email: string; is_pro: boolean; }

interface AuthState {
    user: User | null;
    token: string | null;
    isLoggedIn: boolean;
    setAuth: (token: string, user: User) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: storage.getUser(),
    token: storage.getToken(),
    isLoggedIn: storage.isLoggedIn(),
    setAuth: (token, user) => {
        storage.setToken(token);
        storage.setUser(user);
        set({ token, user, isLoggedIn: true });
    },
    clearAuth: () => {
        storage.clear();
        set({ token: null, user: null, isLoggedIn: false });
    },
}));
