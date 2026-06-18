import axios, { AxiosError } from "axios";
import { toast } from "sonner";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // Centralized timeout configuration
});

// Centralized Response Interceptor for Global Error Handling
api.interceptors.response.use(
  (response) => {
    // Pass successful responses through seamlessly
    return response;
  },
  (error: AxiosError<{ message?: string }>) => {
    // Ignore initial profile auth check failures to prevent toast spam on page load
    const isProfileEndpoint = error.config?.url?.includes("/users/profile");

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || "An error occurred";

      if (status === 401 && !isProfileEndpoint) {
        toast.error("Session expired or unauthorized. Please log in again.");
        // Redirect to login could be handled here: window.location.href = '/login'
      } else if (status === 403) {
        toast.error("You do not have permission to perform this action.");
      } else if (status >= 500) {
        toast.error("Internal Server Error. Please try again later.");
      } else if (!isProfileEndpoint) {
        toast.error(message);
      }
    } else if (error.request) {
      // Network errors (e.g., no internet, CORS blocked, server dead)
      toast.error("Network error. Please check your connection or server status.");
    } else {
      // Something happened in setting up the request that triggered an Error
      toast.error("An unexpected error occurred.");
    }

    return Promise.reject(error);
  }
);
