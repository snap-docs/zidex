import { invoke } from "@tauri-apps/api/core";
import { useExplanationStore } from "../stores/explanationStore";
import { explainService } from "../services/explainService";

export const useExplain = () => {
    const { setLoading, setResult, setError } = useExplanationStore();

    const triggerExplain = async () => {
        setLoading("Capturing selection...");
        try {
            const text = await invoke<string>("get_selected_text");
            if (!text?.trim()) { setError("Nothing selected.\nHighlight text and press Ctrl+Space."); return; }
            setLoading("Explaining...");
            const [result, quota] = await Promise.all([
                explainService.explain({ selected_text: text }),
                explainService.getQuota(),
            ]);
            setResult(result, quota);
        } catch (e: any) {
            if (e?.response?.status === 429) setError("Daily limit reached.\nUpgrade to Pro for unlimited.");
            else if (e?.code === "ERR_NETWORK") setError("No internet connection.");
            else setError("Something went wrong. Try again.");
        }
    };

    return { triggerExplain };
};
