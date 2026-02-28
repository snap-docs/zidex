import axios from "axios";
import { storage } from "../utils/storage";
import { BACKEND_URL } from "../utils/constants";

const api = axios.create({ baseURL: BACKEND_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
    const token = storage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (error) => {
        if (error.response?.status === 401) { storage.clear(); window.location.reload(); }
        return Promise.reject(error);
    }
);

export default api;
