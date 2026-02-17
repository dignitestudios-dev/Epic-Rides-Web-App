import axios from "axios";
import { ErrorToast } from "./components/global/Toaster"; // Import your toaster functions
import Cookies from "js-cookie";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

export const baseUrl = "https://api.dev.epicridesapp.com";
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
  timeout: 10000, // 10 seconds timeout
});

instance.interceptors.request.use(async (request) => {
  const token = Cookies.get("token");
  if (!navigator.onLine) {
    // No internet connection
    ErrorToast(
      "No internet connection. Please check your network and try again."
    );
    return;
    // return Promise.reject(new Error("No internet connection"));
  }

  // Get device fingerprint dynamically
  const deviceFingerprint = await getDeviceFingerprint();

  // Merge existing headers with token and device fingerprint
  request.headers = {
    ...request.headers,
    Accept: "application/json, text/plain, */*",
    ...(deviceFingerprint && {
      devicemodel: deviceFingerprint,
      deviceuniqueid: deviceFingerprint,
    }),
    ...(token && { Authorization: `Bearer ${token}` }), // Add Authorization only if token exists
  };

  return request;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      // Slow internet or request timeout
      ErrorToast("Your internet connection is slow. Please try again.");
    }

    if (error.response && error.response.status === 401) {
      // Unauthorized error
      Cookies.remove("token");
      Cookies.remove("user");
      ErrorToast("Session expired. Please relogin");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default instance;
