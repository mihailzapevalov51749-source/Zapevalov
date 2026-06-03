import { useEffect, useMemo, useState } from "react";

import UserPicker from "../../users/UserPicker";
import { fieldEditorInputStyle } from "../fieldEditorStyles";
import { normalizeUserFieldId } from "../userFieldValueUtils";
import {
  findPickerUserById,
  loadPickerUsers,
} from "../../users/userPickerUtils";

export default function UserFieldEditor({
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
  inline = false,
  onDismiss,
}) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const selectedId = normalizeUserFieldId(value);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const list = await loadPickerUsers();

        if (isMounted) {
          setUsers(list);
        }
      } catch (error) {
        console.error("Не удалось загрузить пользователей:", error);

        if (isMounted) {
          setUsers([]);
          setLoadError("Не удалось загрузить список пользователей");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedUser = useMemo(
    () => findPickerUserById(users, selectedId),
    [selectedId, users],
  );

  if (loadError && users.length === 0 && !readOnly) {
    return (
      <input
        type="number"
        min={1}
        style={fieldEditorInputStyle}
        value={selectedId != null ? String(selectedId) : ""}
        placeholder="user_id"
        autoFocus={autoFocus}
        onChange={(event) => {
          const raw = event.target.value.trim();

          if (!raw) {
            onChange?.(null);
            return;
          }

          const parsed = Number(raw);

          onChange?.(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
        }}
      />
    );
  }

  return (
    <UserPicker
      users={users}
      selectedUser={selectedUser}
      selectedUserId={selectedId}
      onChange={onChange}
      readOnly={readOnly}
      autoFocus={autoFocus}
      inline={inline}
      isLoading={isLoading}
      placeholder="Выберите пользователя"
      onDismiss={onDismiss}
    />
  );
}
