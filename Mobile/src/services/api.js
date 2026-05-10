import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Replace with your local machine IP for Android emulator
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.179.98.170:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// In-memory token cache — avoids AsyncStorage disk read on every request.
// Call clearTokenCache() on logout so the next login reads a fresh token.
let _cachedToken = null;

export const clearTokenCache = () => {
  _cachedToken = null;
};

// Request interceptor — reads from AsyncStorage only once, then uses cache
api.interceptors.request.use(
  async (config) => {
    if (_cachedToken === null) {
      _cachedToken = await AsyncStorage.getItem("userToken");
    }
    if (_cachedToken) {
      config.headers.Authorization = `Bearer ${_cachedToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
