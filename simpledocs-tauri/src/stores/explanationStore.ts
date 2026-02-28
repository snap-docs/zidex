import { create } from "zustand";

interface ExplanationState {
    result: any | null;
    quota: any | null;
    isLoading: boolean;
    error: string | null;
    status: string;
    setLoading: (status: string) => void;
    setResult: (result: any, quota: any) => void;
    setError: (error: string) => void;
    reset: () => void;
}

export const useExplanationStore = create<ExplanationState>((set) => ({
    result: null, quota: null, isLoading: false, error: null,
    status: "Select code and press Ctrl+Space",
    setLoading: (status) => set({ isLoading: true, error: null, status, result: null }),
    setResult: (result, quota) => set({ result, quota, isLoading: false, error: null, status: "done" }),
    setError: (error) => set({ error, isLoading: false, status: "error" }),
    reset: () => set({ result: null, error: null, isLoading: false, status: "Select code and press Ctrl+Space" }),
}));
