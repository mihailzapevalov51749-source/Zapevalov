import { useCallback, useEffect, useState } from "react";

import {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
} from "../api/notificationsApi";

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getNotifications();

      setNotifications(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Ошибка загрузки уведомлений",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data =
        await getUnreadNotificationsCount();

      setUnreadCount(data?.count || 0);
    } catch (error) {
      console.error(
        "Ошибка загрузки количества уведомлений",
        error
      );
    }
  }, []);

  const handleReadNotification = useCallback(
    async (notificationId) => {
      try {
        await markNotificationAsRead(
          notificationId
        );

        setNotifications((prev) =>
          prev.map((item) => {
            if (item.id !== notificationId) {
              return item;
            }

            return {
              ...item,
              is_read: true,
            };
          })
        );

        setUnreadCount((prev) =>
          Math.max(prev - 1, 0)
        );
      } catch (error) {
        console.error(
          "Ошибка прочтения уведомления",
          error
        );
      }
    },
    []
  );

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [
    loadNotifications,
    loadUnreadCount,
  ]);

  return {
    notifications,

    unreadCount,

    loading,

    reloadNotifications: loadNotifications,

    reloadUnreadCount: loadUnreadCount,

    markAsRead: handleReadNotification,
  };
}