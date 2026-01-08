import { defineStore } from "pinia";
import { ref } from "vue";
import { messageAPI, userAPI } from "@/api";

export const useChatStore = defineStore("chat", () => {
  const messages = ref([]);
  const users = ref([]);
  const onlineUsers = ref([]);
  const currentChat = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  async function loadMessages(username, otherUser) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await messageAPI.getPrivateChat(username, otherUser);
      messages.value = response.data;
      currentChat.value = otherUser;
    } catch (err) {
      error.value = "Không thể tải tin nhắn";
      console.error(err);
    } finally {
      isLoading.value = false;
    }
  }

  async function sendMessage(username, content, recipient) {
    try {
      const response = await messageAPI.sendMessage(username, {
        content,
        recipient,
        message_type: "TEXT",
      });
      messages.value.push(response.data);
      return response.data;
    } catch (err) {
      error.value = "Không thể gửi tin nhắn";
      throw err;
    }
  }

  async function loadUsers() {
    try {
      const response = await userAPI.getUsers();
      users.value = response.data;
    } catch (err) {
      console.error("Lỗi tải danh sách người dùng:", err);
    }
  }

  async function loadOnlineUsers() {
    try {
      const response = await userAPI.getOnlineUsers();
      onlineUsers.value = response.data;
    } catch (err) {
      console.error("Lỗi tải người dùng online:", err);
    }
  }

  function addMessage(message) {
    if (
      currentChat.value === message.sender ||
      currentChat.value === message.recipient
    ) {
      messages.value.push(message);
    }
  }

  return {
    messages,
    users,
    onlineUsers,
    currentChat,
    isLoading,
    error,
    loadMessages,
    sendMessage,
    loadUsers,
    loadOnlineUsers,
    addMessage,
  };
});
