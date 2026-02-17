import axios from "axios";
import { ErrorToast } from "./components/global/Toaster"; // Import your toaster functions
import Cookies from "js-cookie";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

// export const baseUrl = "https://api.dev.epicridesapp.com";
// export const baseUrl = "https://api.staging.epicridesapp.com";
export const baseUrl = "https://api.epicridesapp.com";
// export const baseUrl = "https://kv6hzw0r-3001.inc1.devtunnels.ms";
// export const baseUrl = "https://155e-45-199-187-86.ngrok-free.app";

// Cache for device fingerprint to avoid multiple calls
let deviceFingerprintCache = null;
let fingerprintPromise = null;

async function getDeviceFingerprint() {
  // Return cached value if available
  if (deviceFingerprintCache) {
    return deviceFingerprintCache;
  }

  // If already loading, return the existing promise
  if (fingerprintPromise) {
    return fingerprintPromise;
  }

  // Load fingerprint and cache it
  fingerprintPromise = (async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      deviceFingerprintCache = result.visitorId;
      console.log(result.visitorId); // Unique device ID
      return deviceFingerprintCache;
    } catch (error) {
      console.error("Error getting device fingerprint:", error);
      fingerprintPromise = null;
      return null;
    }
  })();

  return fingerprintPromise;
}

const instance = axios.create({
  baseURL: baseUrl,
  timeout: 30000, // Increase timeout to 30 seconds
});

// API is cross-origin; js-cookie on the app origin is not sent to the API. Attach JWT explicitly.
instance.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const TIMEOUT_MESSAGE = "The request timed out. Please try again.";

const isTimeoutError = (error) =>
  error?.code === "ECONNABORTED" ||
  error?.code === "ETIMEDOUT" ||
  (typeof error?.message === "string" && error.message.toLowerCase().includes("timeout"));

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!navigator.onLine) {
      ErrorToast("Your internet connection is slow. Please try again.");
      return Promise.reject(error);
    }

    if (isTimeoutError(error)) {
      error.message = TIMEOUT_MESSAGE;
      ErrorToast(TIMEOUT_MESSAGE);
      return Promise.reject(error);
    }

    if (error.message?.includes("Network Error") || !error.response) {
      if (error.code !== "ECONNABORTED" && !isTimeoutError(error)) {
        ErrorToast("Your internet connection is slow. Please try again.");
      }
      return Promise.reject(error);
    }

    if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
      ErrorToast("Your internet connection is slow. Please try again.");
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      Cookies.remove("token");
      Cookies.remove("user");
      ErrorToast("Session expired. Please relogin");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default instance;
