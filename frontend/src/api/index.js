import api from "./client";

export const authAPI = {
  register(username, password, email) {
    return api.post("/auth/register", {
      username,
      password,
      email: email || null,
    });
  },

  login(username, password) {
    return api.post("/auth/login", {
      username,
      password,
    });
  },

  logout(username) {
    return api.post("/auth/logout", null, {
      params: { username },
    });
  },
};

export const userAPI = {
  getUsers() {
    return api.get("/users");
  },

  getOnlineUsers() {
    return api.get("/users/online");
  },

  getUserProfile(username) {
    return api.get(`/users/${username}`);
  },
};

export const messageAPI = {
  getPrivateChat(username, otherUser, limit = 50) {
    return api.get(`/messages/private/${username}`, {
      params: { other_user: otherUser, limit },
    });
  },

  getUnreadMessages(username) {
    return api.get(`/messages/unread/${username}`);
  },

  sendMessage(username, data) {
    return api.post("/messages/send", data, {
      params: { username },
    });
  },

  markAsRead(messageId) {
    return api.put(`/messages/mark-read/${messageId}`);
  },
};

export const roomAPI = {
  createRoom(username, data) {
    return api.post("/rooms", data, {
      params: { username },
    });
  },

  getRooms() {
    return api.get("/rooms");
  },

  getUserRooms(username) {
    return api.get(`/rooms/user/${username}`);
  },

  joinRoom(roomId, username) {
    return api.post(`/rooms/${roomId}/join`, null, {
      params: { username },
    });
  },

  leaveRoom(roomId, username) {
    return api.post(`/rooms/${roomId}/leave`, null, {
      params: { username },
    });
  },

  getRoomMessages(roomId, limit = 50) {
    return api.get(`/rooms/${roomId}/messages`, {
      params: { limit },
    });
  },

  sendRoomMessage(roomId, data) {
    return api.post(`/rooms/${roomId}/messages`, data);
  },
};
