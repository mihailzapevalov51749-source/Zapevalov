export const OBJECT_PREVIEW_MOCK_USERS = [
  {
    userId: "preview-user-1",
    id: "preview-user-1",
    name: "Иван Петров",
    avatarUrl: "",
    avatarSettings: null,
  },
  {
    userId: "preview-user-2",
    id: "preview-user-2",
    name: "Анна Смирнова",
    avatarUrl: "",
    avatarSettings: null,
  },
  {
    userId: "preview-user-3",
    id: "preview-user-3",
    name: "Олег Кузнецов",
    avatarUrl: "",
    avatarSettings: null,
  },
];

export function resolveObjectPreviewMockUser(index) {
  const users = OBJECT_PREVIEW_MOCK_USERS;
  return users[Math.abs(Number(index) || 0) % users.length];
}
