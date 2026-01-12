<template>
  <div class="chat-container">
    <a-layout style="min-height: 100vh">
      <!-- Sidebar -->
      <a-layout-sider width="280" style="background: #fff">
        <div class="sidebar-header">
          <div class="user-info">
            <a-avatar
              size="large"
              :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`"
            />
            <div>
              <h3>{{ currentUser?.username }}</h3>
              <span class="status" :class="{ online: isOnline }">
                {{ isOnline ? "● Đang hoạt động" : "● Ngoại tuyến" }}
              </span>
            </div>
          </div>
          <a-button type="text" danger @click="handleLogout">
            <template #icon>
              <LogoutOutlined />
            </template>
          </a-button>
        </div>

        <a-divider />

        <!-- Tabs -->
        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane key="1" tab="Chat">
            <div class="contact-list">
              <a-input-search
                placeholder="Tìm kiếm..."
                v-model:value="searchQuery"
              />
              <a-list :data-source="filteredUsers" size="small">
                <template #renderItem="{ item }">
                  <a-list-item
                    @click="selectUser(item)"
                    :class="{
                      active: selectedUser?.username === item.username,
                    }"
                  >
                    <template #avatar>
                      <a-avatar
                        :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username}`"
                      />
                    </template>
                    <a-list-item-meta>
                      <template #title>{{ item.username }}</template>
                      <template #description>
                        <span class="online-badge" v-if="item.is_online"
                          >● Online</span
                        >
                      </template>
                    </a-list-item-meta>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </a-tab-pane>

          <a-tab-pane key="2" tab="Phòng">
            <div class="rooms-list">
              <a-button
                block
                type="primary"
                @click="showGroupModal = true"
                class="mb-16"
              >
                <template #icon>
                  <PlusOutlined />
                </template>
                Lập Group
              </a-button>
              <a-list :data-source="userRooms" size="small">
                <template #renderItem="{ item }">
                  <a-list-item
                    @click="selectRoom(item)"
                    :class="{
                      active:
                        (selectedRoom?._id || selectedRoom?.id) ===
                        (item._id || item.id),
                    }"
                  >
                    <a-list-item-meta>
                      <template #avatar>
                        <a-avatar icon="team" />
                      </template>
                      <template #title>{{ item.room_name }}</template>
                    </a-list-item-meta>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-layout-sider>

      <!-- Main Chat Area -->
      <a-layout-content style="background: #f5f5f5; padding: 24px">
        <div class="chat-area">
          <div v-if="selectedUser && !selectedRoom" class="chat-header">
            <h2>{{ selectedUser.username }}</h2>
            <span class="online-badge" v-if="selectedUser.is_online"
              >● Online</span
            >
          </div>

          <div v-else-if="selectedRoom" class="chat-header">
            <h2>{{ selectedRoom.room_name }}</h2>
            <span>{{ selectedRoom.members?.length || 0 }} thành viên</span>
          </div>

          <div v-else class="empty-state">
            <a-empty description="Chọn một cuộc trò chuyện để bắt đầu" />
          </div>

          <!-- Messages -->
          <div v-if="selectedUser || selectedRoom" class="messages-container">
            <div class="messages">
              <div
                v-for="msg in displayMessages"
                :key="msg.id"
                :class="[
                  'message',
                  msg.sender === currentUser?.username ? 'sent' : 'received',
                ]"
              >
                <div class="message-content">{{ msg.content }}</div>
                <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
              </div>
            </div>

            <!-- Input -->
            <div class="message-input">
              <a-input-group compact>
                <a-input
                  v-model:value="newMessage"
                  placeholder="Nhập tin nhắn..."
                  @keyup.enter="sendMessage"
                  style="flex: 1"
                />
                <a-button
                  type="primary"
                  @click="sendMessage"
                  :loading="isSending"
                >
                  <template #icon>
                    <SendOutlined />
                  </template>
                  Gửi
                </a-button>
              </a-input-group>
            </div>
          </div>
        </div>
      </a-layout-content>
    </a-layout>

    <!-- Create Group Modal -->
    <a-modal
      v-model:open="showGroupModal"
      title="Lập Group Chat"
      @ok="handleCreateGroup"
      width="500px"
    >
      <a-form :model="groupForm" layout="vertical">
        <a-form-item label="Tên Group" required>
          <a-input
            v-model:value="groupForm.group_name"
            placeholder="Nhập tên group"
          />
        </a-form-item>
        <a-form-item label="Chọn thành viên" required>
          <a-select
            v-model:value="groupForm.members"
            mode="multiple"
            placeholder="Chọn các thành viên"
            :options="memberOptions"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { message } from "ant-design-vue";
import {
  LogoutOutlined,
  PlusOutlined,
  SendOutlined,
} from "@ant-design/icons-vue";
import { messageAPI, roomAPI, userAPI } from "@/api";

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();

const activeTab = ref("1");
const selectedUser = ref(null);
const selectedRoom = ref(null);
const newMessage = ref("");
const isSending = ref(false);
const searchQuery = ref("");
const isOnline = ref(true);
const showGroupModal = ref(false);
const groupForm = ref({ group_name: "", members: [] });
const userRooms = ref([]);
const displayMessages = ref([]);

const currentUser = computed(() => authStore.user);

const filteredUsers = computed(() => {
  return chatStore.users.filter(
    (u) =>
      u.username !== currentUser.value?.username &&
      u.username.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const memberOptions = computed(() => {
  return chatStore.users
    .filter((u) => u.username !== currentUser.value?.username)
    .map((u) => ({
      label: u.username,
      value: u.username,
    }));
});

async function loadData() {
  try {
    await chatStore.loadUsers();
    await chatStore.loadOnlineUsers();
    if (currentUser.value) {
      const response = await roomAPI.getUserRooms(currentUser.value.username);
      userRooms.value = response.data;
    }
  } catch (err) {
    console.error("Error loading chat data:", err);
  }
}

async function selectUser(user) {
  selectedUser.value = user;
  selectedRoom.value = null;
  if (currentUser.value) {
    try {
      const response = await messageAPI.getPrivateChat(
        currentUser.value.username,
        user.username
      );
      displayMessages.value = response.data;
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  }
}

async function selectRoom(room) {
  selectedRoom.value = room;
  selectedUser.value = null;
  try {
    const roomId = room._id || room.id;
    const response = await roomAPI.getRoomMessages(roomId);
    displayMessages.value = response.data;
  } catch (err) {
    console.error("Error loading room messages:", err);
  }
}

async function sendMessage() {
  if (!newMessage.value.trim()) return;
  if (!selectedUser.value && !selectedRoom.value) {
    message.warning("Vui lòng chọn một cuộc trò chuyện");
    return;
  }

  isSending.value = true;
  try {
    if (selectedUser.value) {
      const response = await messageAPI.sendMessage(
        currentUser.value.username,
        {
          content: newMessage.value,
          recipient: selectedUser.value.username,
          message_type: "TEXT",
        }
      );
      displayMessages.value.push(response.data);
    } else if (selectedRoom.value) {
      // Send room message
      const roomId = selectedRoom.value._id || selectedRoom.value.id;
      const response = await roomAPI.sendRoomMessage(roomId, {
        room_id: roomId,
        sender: currentUser.value.username,
        content: newMessage.value,
        message_type: "TEXT",
      });
      displayMessages.value.push(response.data);
    }
    newMessage.value = "";
  } finally {
    isSending.value = false;
  }
}

async function handleCreateGroup() {
  if (!groupForm.value.group_name) {
    message.error("Vui lòng nhập tên group");
    return;
  }

  if (groupForm.value.members.length === 0) {
    message.error("Vui lòng chọn ít nhất 1 thành viên");
    return;
  }

  if (!currentUser.value) {
    message.error("Vui lòng đăng nhập");
    return;
  }

  try {
    const response = await roomAPI.createRoom(currentUser.value.username, {
      room_name: groupForm.value.group_name,
      description: "",
      members: groupForm.value.members,
    });
    userRooms.value.push(response.data);
    showGroupModal.value = false;
    groupForm.value = { group_name: "", members: [] };
    message.success("Lập group thành công!");
  } catch (err) {
    message.error(
      "Lỗi lập group: " + (err.response?.data?.detail || err.message)
    );
    console.error(err);
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push("/login");
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Tải tin nhắn khi chọn user/room (không auto-refresh)
async function loadMessages() {
  try {
    if (selectedUser.value && currentUser.value) {
      const response = await messageAPI.getPrivateChat(
        currentUser.value.username,
        selectedUser.value.username
      );
      displayMessages.value = response.data;
    } else if (selectedRoom.value) {
      const roomId = selectedRoom.value._id || selectedRoom.value.id;
      const response = await roomAPI.getRoomMessages(roomId);
      displayMessages.value = response.data;
    }
  } catch (err) {
    console.error("Lỗi tải tin nhắn:", err);
  }
}

// Theo dõi thay đổi user/room
watch([selectedUser, selectedRoom], () => {
  if (selectedUser.value || selectedRoom.value) {
    loadMessages(); // Tải tin nhắn khi thay đổi
  }
});

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push("/login");
    return;
  }
  await loadData();
});
</script>

<style scoped>
.chat-container {
  background: white;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.user-info {
  display: flex;
  gap: 12px;
  flex: 1;
}

.user-info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.status {
  font-size: 12px;
  color: #999;
}

.status.online {
  color: #52c41a;
}

.contact-list {
  padding: 0 8px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 4px;
  margin-bottom: 16px;
}

.chat-header h2 {
  margin: 0;
  font-size: 16px;
}

.online-badge {
  color: #52c41a;
  font-size: 12px;
}

.messages-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.message.sent {
  align-self: flex-end;
}

.message.received {
  align-self: flex-start;
}

.message-content {
  padding: 8px 12px;
  border-radius: 4px;
  background: #e6f7ff;
}

.message.sent .message-content {
  background: #1890ff;
  color: white;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  padding: 0 8px;
}

.message-input {
  padding: 16px;
  background: white;
  border-top: 1px solid #f0f0f0;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 200px);
}

.rooms-list {
  padding: 0 8px;
}

.mb-16 {
  margin-bottom: 16px;
}
</style>
