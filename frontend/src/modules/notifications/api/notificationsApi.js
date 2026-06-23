import { runtimeFetch } from "../../../api/runtimeFetch.js";

export async function getNotifications() {
  return runtimeFetch("/notifications");
}

export async function getUnreadNotificationsCount() {
  return runtimeFetch("/notifications/unread-count");
}

export async function markNotificationAsRead(notificationId) {
  return runtimeFetch(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}
