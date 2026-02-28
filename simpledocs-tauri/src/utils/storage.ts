const TOKEN_KEY = "simpledocs_token";
const USER_KEY = "simpledocs_user";

export const storage = {
    setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
    getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
    setUser: (user: object) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
    getUser: () => {
        const d = localStorage.getItem(USER_KEY);
        return d ? JSON.parse(d) : null;
    },
    clear: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
    isLoggedIn: (): boolean => !!localStorage.getItem(TOKEN_KEY),
};
