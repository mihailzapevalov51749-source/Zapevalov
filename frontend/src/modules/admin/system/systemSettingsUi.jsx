export function CardTitle({ title, badge }) {
  return (
    <div style={cardTitleRowStyle}>
      <div style={cardTitleStyle}>{title}</div>
      {badge ? <div style={badgeStyle}>{badge}</div> : null}
    </div>
  );
}

export function Field({ label, value }) {
  return (
    <div style={fieldWrapperStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <input value={value} readOnly style={inputStyle} />
    </div>
  );
}

export function TextAreaField({ label, value }) {
  return (
    <div style={fieldWrapperStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <textarea value={value} readOnly style={textareaStyle} />
    </div>
  );
}

export function ToggleField({ label, enabled = false }) {
  return (
    <div style={toggleFieldStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <Toggle enabled={enabled} />
    </div>
  );
}

export function SettingRow({ title, description, right }) {
  return (
    <div style={toggleRowStyle}>
      <div>
        <div style={toggleTitleStyle}>{title}</div>
        {description ? <div style={toggleDescriptionStyle}>{description}</div> : null}
      </div>
      {right}
    </div>
  );
}

export function ToggleRow({ title, description, enabled = false, compact = false }) {
  return (
    <div style={compact ? compactToggleRowStyle : toggleRowStyle}>
      <div>
        <div style={compact ? compactToggleTitleStyle : toggleTitleStyle}>
          {title}
        </div>
        {description ? <div style={toggleDescriptionStyle}>{description}</div> : null}
      </div>
      <Toggle enabled={enabled} />
    </div>
  );
}

export function Toggle({ enabled = false }) {
  return (
    <div
      style={{
        ...toggleStyle,
        ...(enabled ? toggleEnabledStyle : null),
      }}
    >
      <div
        style={{
          ...toggleCircleStyle,
          ...(enabled ? toggleCircleEnabledStyle : null),
        }}
      />
    </div>
  );
}

export function SmallSelect({ value }) {
  return <div style={smallSelectStyle}>{value}</div>;
}

export function StorageRow({ label, value }) {
  return (
    <div style={storageRowStyle}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function InfoRow({ label, value }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={infoValueStyle}>{value}</span>
    </div>
  );
}

export const SYSTEM_SETTINGS_TABS = [
  "Общие настройки",
  "Брендинг",
  "Локализация",
  "Уведомления",
  "Лимиты и квоты",
  "Резервное копирование",
  "Безопасность",
  "Поведение системы",
];

export const pageStyle = {
  width: "100%",
  minHeight: "100%",
  height: "auto",
  padding: "18px 20px 48px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxSizing: "border-box",
};

export const tabsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  paddingBottom: 10,
  borderBottom: "1px solid #E2E8F0",
  overflowX: "auto",
};

export const tabButtonStyle = {
  height: 34,
  padding: "0 14px",
  border: "none",
  borderRadius: 0,
  background: "transparent",
  fontSize: 13,
  fontWeight: 600,
  color: "#0F172A",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const activeTabButtonStyle = {
  color: "#2563EB",
  borderBottom: "2px solid #2563EB",
};

export const topGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1.25fr 1.1fr",
  gap: 14,
  alignItems: "start",
};

export const bottomGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: 14,
  alignItems: "start",
};

export const settingsTabPageStyle = {
  width: "100%",
  padding: "8px 12px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  boxSizing: "border-box",
};

export const settingsTabGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
  alignItems: "start",
};

export const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  boxSizing: "border-box",
};

export const cardTitleRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

export const cardTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#0F172A",
};

export const badgeStyle = {
  padding: "3px 8px",
  borderRadius: 999,
  background: "#DCFCE7",
  color: "#16A34A",
  fontSize: 10,
  fontWeight: 700,
};

export const fieldsColumnStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

export const fieldWrapperStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

export const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748B",
};

export const inputStyle = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  border: "1px solid #CBD5E1",
  borderRadius: 7,
  background: "#FFFFFF",
  fontSize: 12,
  color: "#0F172A",
  boxSizing: "border-box",
  outline: "none",
};

export const textareaStyle = {
  width: "100%",
  minHeight: 70,
  padding: 10,
  border: "1px solid #CBD5E1",
  borderRadius: 7,
  background: "#FFFFFF",
  fontSize: 12,
  lineHeight: 1.35,
  color: "#0F172A",
  resize: "none",
  boxSizing: "border-box",
  outline: "none",
};

export const twoColumnsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

export const twoColumnsWideLeftStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 86px",
  gap: 10,
};

export const saveButtonStyle = {
  height: 34,
  padding: "0 16px",
  border: "none",
  borderRadius: 7,
  background: "#2563EB",
  fontSize: 12,
  fontWeight: 700,
  color: "#FFFFFF",
  cursor: "pointer",
  alignSelf: "flex-start",
};

export const outlineButtonStyle = {
  height: 34,
  padding: "0 16px",
  border: "1px solid #BFDBFE",
  borderRadius: 7,
  background: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700,
  color: "#2563EB",
  cursor: "pointer",
  alignSelf: "flex-start",
};

export const settingsListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const toggleRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const compactToggleRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const toggleTitleStyle = {
  fontSize: 13,
  fontWeight: 800,
  color: "#0F172A",
};

const compactToggleTitleStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "#0F172A",
};

const toggleDescriptionStyle = {
  marginTop: 4,
  fontSize: 11,
  lineHeight: 1.35,
  color: "#64748B",
};

const toggleStyle = {
  width: 34,
  height: 18,
  borderRadius: 999,
  background: "#CBD5E1",
  position: "relative",
  flexShrink: 0,
};

const toggleEnabledStyle = {
  background: "#2563EB",
};

const toggleCircleStyle = {
  width: 14,
  height: 14,
  borderRadius: "50%",
  background: "#FFFFFF",
  position: "absolute",
  top: 2,
  left: 2,
  transition: "all 160ms ease",
};

const toggleCircleEnabledStyle = {
  left: 18,
};

const toggleFieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const smallSelectStyle = {
  height: 30,
  minWidth: 70,
  padding: "0 10px",
  border: "1px solid #CBD5E1",
  borderRadius: 7,
  background: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  color: "#0F172A",
  boxSizing: "border-box",
};

export const storageCardStyle = {
  padding: 12,
  borderRadius: 8,
  background: "#F8FAFC",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export const storageHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: 12,
  fontWeight: 800,
  color: "#0F172A",
};

export const storageMetaStyle = {
  fontSize: 11,
  color: "#64748B",
};

export const progressBarStyle = {
  width: "100%",
  height: 7,
  borderRadius: 999,
  background: "#E2E8F0",
  overflow: "hidden",
};

export const progressValueStyle = {
  width: "62%",
  height: "100%",
  background: "#2563EB",
};

export const storageRowsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const storageRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 10,
  color: "#64748B",
};

export const systemInfoListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 11,
};

const infoRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
};

const infoLabelStyle = {
  fontSize: 11,
  color: "#64748B",
};

const infoValueStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#0F172A",
  whiteSpace: "nowrap",
};
