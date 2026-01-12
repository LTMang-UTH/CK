import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/store/auth";
import LoginView from "@/views/LoginView.vue";
import ChatView from "@/views/ChatView.vue";

const routes = [
  {
    path: "/login",
    component: LoginView,
    meta: { requiresAuth: false },
  },
  {
    path: "/chat",
    component: ChatView,
    meta: { requiresAuth: true },
  },
  {
    path: "/",
    redirect: "/chat",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  authStore.loadUserFromStorage();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next("/login");
  } else if (to.path === "/login" && authStore.isAuthenticated) {
    next("/chat");
  } else {
    next();
  }
});

export default router;
