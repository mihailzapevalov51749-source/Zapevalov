import { useEffect, useState } from "react";
import { styles } from "../styles/profileSidePanelStyles";

export default function ConfirmSavePopover({ onConfirm, onCancel, onReject }) {
  const [isSaving, setIsSaving] = useState(false);

  // Закрытие по Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  const handleConfirm = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      await onConfirm?.();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        ...styles.confirmOverlay,
        pointerEvents: "auto",
      }}
      onClick={onCancel}
    >
      <div
        style={styles.confirmBox}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={styles.confirmTitle}>Сохранить изменения?</h3>

        <p style={styles.confirmText}>
          Изменения будут записаны в профиль пользователя.
        </p>

        <div style={styles.confirmActions}>
          <button
            type="button"
            style={{
              ...styles.confirmPrimaryButton,
              opacity: isSaving ? 0.7 : 1,
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
            onClick={handleConfirm}
            disabled={isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>

          <button
            type="button"
            style={styles.confirmSecondaryButton}
            onClick={onCancel}
            disabled={isSaving}
          >
            Назад
          </button>

          <button
            type="button"
            style={styles.confirmGhostButton}
            onClick={onReject}
            disabled={isSaving}
          >
            Отменить
          </button>
        </div>
      </div>
    </div>
  );
}