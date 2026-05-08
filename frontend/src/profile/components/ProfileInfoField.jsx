import { styles } from "../styles/profileSidePanelStyles";

export default function ProfileInfoField({ label, value, editable, onChange }) {
  return (
    <div style={styles.infoRow}>
      <div style={styles.infoLabel}>{label}</div>

      {editable ? (
        <input
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          style={styles.inlineInput}
        />
      ) : (
        <div style={styles.infoValue}>{value || "Не указано"}</div>
      )}
    </div>
  );
}