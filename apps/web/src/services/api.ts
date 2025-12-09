import axios, { AxiosResponse } from "axios";

const api = axios.create({
  baseURL: "api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 12000,
});

// Extend the response object to include custom fields if needed
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // We attach data + status as custom fields (safe)
    (response as any).ok = response.status >= 200 && response.status < 300;
    return response;
  },
  (error) => {
    const formatted = {
      ok: false,
      status: error.response?.status || 500,
      data: error.response?.data || { message: "Network Error" },
    };
    return Promise.reject(formatted);
  }
);

export default api;
