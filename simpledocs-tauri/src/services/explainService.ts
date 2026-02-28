import api from "./api";

export const explainService = {
    explain: async (d: { selected_text: string; context?: string; app_name?: string }) =>
        (await api.post("/explain", d)).data,
    getQuota: async () => (await api.get("/explain/quota")).data,
};
