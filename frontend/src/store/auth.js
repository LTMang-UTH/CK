import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { authAPI } from "@/api";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const token = ref(localStorage.getItem("token") || null);
  const isLoading = ref(false);
  const error = ref(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  async function register(username, password, email) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.register(username, password, email);
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.detail || "Đăng ký thất bại";
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function login(username, password) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authAPI.login(username, password);
      token.value = response.data.access_token;
      user.value = response.data.user;
      localStorage.setItem("token", token.value);
      localStorage.setItem("user", JSON.stringify(user.value));
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.detail || "Đăng nhập thất bại";
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    try {
      if (user.value) {
        await authAPI.logout(user.value.username);
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      user.value = null;
      token.value = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  function loadUserFromStorage() {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      user.value = JSON.parse(storedUser);
      token.value = storedToken;
    }
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    loadUserFromStorage,
  };
});
