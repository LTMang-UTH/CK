<template>
  <div class="login-container">
    <div class="login-card">
      <div class="logo">
        <MessageOutlined :style="{ fontSize: '48px', color: '#1890ff' }" />
        <h1>RealChat</h1>
        <p>Ứng dụng chat hiện đại với MongoDB + Vue.js</p>
      </div>

      <div class="tabs">
        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane key="1" tab="Đăng nhập">
            <a-form @finish="handleLogin" :model="loginForm" layout="vertical">
              <a-form-item
                label="Tên đăng nhập"
                name="username"
                :rules="[{ required: true, message: 'Vui lòng nhập tên' }]"
              >
                <a-input
                  v-model:value="loginForm.username"
                  placeholder="Nhập tên đăng nhập"
                />
              </a-form-item>

              <a-form-item
                label="Mật khẩu"
                name="password"
                :rules="[{ required: true, message: 'Vui lòng nhập mật khẩu' }]"
              >
                <a-input-password
                  v-model:value="loginForm.password"
                  placeholder="Nhập mật khẩu"
                />
              </a-form-item>

              <a-form-item>
                <a-button
                  type="primary"
                  html-type="submit"
                  block
                  :loading="authStore.isLoading"
                >
                  Đăng nhập
                </a-button>
              </a-form-item>

              <a-alert
                v-if="authStore.error"
                :message="authStore.error"
                type="error"
                show-icon
              />
            </a-form>
          </a-tab-pane>

          <a-tab-pane key="2" tab="Đăng ký">
            <a-form
              @finish="handleRegister"
              :model="registerForm"
              layout="vertical"
            >
              <a-form-item
                label="Tên đăng nhập"
                name="username"
                :rules="[{ required: true, message: 'Vui lòng nhập tên' }]"
              >
                <a-input
                  v-model:value="registerForm.username"
                  placeholder="Nhập tên (3-20 ký tự)"
                />
              </a-form-item>

              <a-form-item label="Email" name="email">
                <a-input
                  v-model:value="registerForm.email"
                  type="email"
                  placeholder="Nhập email (tùy chọn)"
                />
              </a-form-item>

              <a-form-item
                label="Mật khẩu"
                name="password"
                :rules="[{ required: true, message: 'Vui lòng nhập mật khẩu' }]"
              >
                <a-input-password
                  v-model:value="registerForm.password"
                  placeholder="Nhập mật khẩu (≥6 ký tự)"
                />
              </a-form-item>

              <a-form-item
                label="Xác nhận mật khẩu"
                name="confirmPassword"
                :rules="[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                ]"
              >
                <a-input-password
                  v-model:value="registerForm.confirmPassword"
                  placeholder="Xác nhận mật khẩu"
                />
              </a-form-item>

              <a-form-item>
                <a-button
                  type="primary"
                  html-type="submit"
                  block
                  :loading="authStore.isLoading"
                >
                  Đăng ký
                </a-button>
              </a-form-item>

              <a-alert
                v-if="authStore.error"
                :message="authStore.error"
                type="error"
                show-icon
              />
            </a-form>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { MessageOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";

const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref("1");

const loginForm = ref({
  username: "",
  password: "",
});

const registerForm = ref({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
});

async function handleLogin() {
  try {
    await authStore.login(loginForm.value.username, loginForm.value.password);
    message.success("Đăng nhập thành công!");
    router.push("/chat");
  } catch (err) {
    console.error("Login error:", err);
  }
}

async function handleRegister() {
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    message.error("Mật khẩu không trùng khớp!");
    return;
  }

  try {
    await authStore.register(
      registerForm.value.username,
      registerForm.value.password,
      registerForm.value.email
    );
    message.success("Đăng ký thành công! Vui lòng đăng nhập");
    activeTab.value = "1";
    loginForm.value.username = registerForm.value.username;
  } catch (err) {
    console.error("Register error:", err);
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 400px;
  padding: 32px;
}

.logo {
  text-align: center;
  margin-bottom: 24px;
}

.logo h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 12px 0 0 0;
  color: #1890ff;
}

.logo p {
  color: #999;
  font-size: 12px;
  margin: 4px 0 0 0;
}

.tabs {
  :deep(.ant-tabs) {
    margin-top: 24px;
  }
}
</style>
