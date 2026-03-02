/// <reference types="vite/client" />

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const WIDGET_COLLAPSED_SIZE = 52;
export const WIDGET_EXPANDED_WIDTH = 320;
export const WIDGET_EXPANDED_HEIGHT = 280;

export const COLORS = {
    glassPrimary: "rgba(255, 255, 255, 0.08)",
    glassSecondary: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.12)",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textDim: "#475569",
    accent: "#6366f1",
    accentGlow: "rgba(99, 102, 241, 0.4)",
    code: "#22d3ee",
    error: "#f87171",
    other: "#a3a3a3",
    success: "#4ade80",
} as const;

export const FREE_DAILY_LIMIT = 30;
