import { useAuthStore } from "../stores/authStore";
import { authService } from "../services/authService";

export const useAuth = () => {
    const { user, isLoggedIn, setAuth, clearAuth } = useAuthStore();

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

    return { user, isLoggedIn, login, signup, logout };
};
