import { useEffect, useMemo, useState } from "react";

import { getUsers } from "../../../api/authApi";

import {
  normalizeUser,
  normalizeAvatarSettings,
  getInitials,
  PROFILE_AVATAR_SIZE,
} from "./userUtils";

let cachedUsers = null;
let cachedUsersPromise = null;

function normalizeUserOption(user) {
  return {
    id: user.id ?? user.userId ?? user.user_id ?? null,

    userId: user.id ?? user.userId ?? user.user_id ?? null,

    name:
      user.full_name ||
      user.fullName ||
      user.displayName ||
      user.display_name ||
      user.name ||
      user.label ||
      user.email ||
      "—",

    email: user.email || "",

    avatarUrl:
      user.avatar_url ||
      user.avatarUrl ||
      user.photo_url ||
      user.photoUrl ||
      user.image_url ||
      user.imageUrl ||
      "",

    avatarSettings:
      user.avatar_settings ||
      user.avatarSettings ||
      null,
  };
}

async function loadActualUsers() {
  if (cachedUsers) {
    return cachedUsers;
  }

  if (!cachedUsersPromise) {
    cachedUsersPromise = getUsers()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.items || [];

        cachedUsers = list.map(normalizeUserOption);

        return cachedUsers;
      })
      .catch((error) => {
        console.error("Не удалось загрузить пользователей:", error);

        cachedUsers = [];

        return cachedUsers;
      })
      .finally(() => {
        cachedUsersPromise = null;
      });
  }

  return cachedUsersPromise;
}

function getUserId(user) {
  return String(
    user?.userId ||
      user?.user_id ||
      user?.id ||
      ""
  );
}

function mergeWithActualUser(snapshotUser, actualUsers = []) {
  if (!snapshotUser) {
    return snapshotUser;
  }

  const snapshotUserId = getUserId(snapshotUser);

  if (!snapshotUserId) {
    return snapshotUser;
  }

  const actualUser =
    actualUsers.find(
      (user) => getUserId(user) === snapshotUserId
    ) || null;

  if (!actualUser) {
    return snapshotUser;
  }

  return {
    ...snapshotUser,

    name:
      actualUser.name ||
      snapshotUser.name,

    email:
      actualUser.email ||
      snapshotUser.email,

    avatarUrl:
      actualUser.avatarUrl ||
      snapshotUser.avatarUrl,

    avatarSettings:
      actualUser.avatarSettings ||
      snapshotUser.avatarSettings,
  };
}

export default function UserValueRenderer({
  value,
  compact = false,
  emptyValue = "—",
}) {
  const snapshotUser = useMemo(() => normalizeUser(value), [value]);

  const [actualUsers, setActualUsers] = useState(cachedUsers || []);

  useEffect(() => {
    let isMounted = true;

    loadActualUsers().then((users) => {
      if (isMounted) {
        setActualUsers(users);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const user = useMemo(
    () => mergeWithActualUser(snapshotUser, actualUsers),
    [snapshotUser, actualUsers]
  );

  const isEmpty = user.name === "—";

  if (isEmpty) {
    return (
      <div
        style={{
          minWidth: 0,
          fontSize: compact ? 12 : 13,
          fontWeight: 500,
          color: "#94A3B8",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {emptyValue}
      </div>
    );
  }

  const size = compact ? 22 : 24;

  const normalizedSettings = normalizeAvatarSettings(user.avatarSettings);

  const avatarRatio = size / PROFILE_AVATAR_SIZE;
  const avatarX = (Number(normalizedSettings.x) || 0) * avatarRatio;
  const avatarY = (Number(normalizedSettings.y) || 0) * avatarRatio;
  const avatarScale = Number(normalizedSettings.scale) || 1;

  return (
    <div
      style={{
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        gap: compact ? 6 : 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          minWidth: size,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#E2E8F0",
          color: "#0F172A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: compact ? 9 : 10,
          fontWeight: 800,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name || "Аватар"}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              userSelect: "none",
              pointerEvents: "none",
              transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarScale})`,
              transformOrigin: "center center",
            }}
          />
        ) : (
          getInitials(user.name)
        )}
      </div>

      <span
        style={{
          minWidth: 0,
          fontSize: compact ? 12 : 13,
          fontWeight: 500,
          color: "#334155",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {user.name}
      </span>
    </div>
  );
}