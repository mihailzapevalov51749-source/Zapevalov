import { useMemo, useState } from "react";

const toneColorMap = {
  success: "#16A34A",
  warning: "#EA580C",
  danger: "#DC2626",
  muted: "#64748B",
  primary: "#2563EB",
};

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const PROFILE_AVATAR_SIZE = 132;
const PREVIEW_AVATAR_SIZE = 24;

function normalizeAvatarSettings(settings) {
  if (!settings) return DEFAULT_AVATAR_SETTINGS;

  if (typeof settings === "string") {
    try {
      return {
        ...DEFAULT_AVATAR_SETTINGS,
        ...JSON.parse(settings),
      };
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (typeof settings === "object") {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      ...settings,
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
}

export default function AdminLauncherCard({
  title,
  subtitle,
  description,
  actionLabel,
  metrics = [],
  previewTitle,
  previewItems = [],
  route,
  onNavigate,
  icon,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const visibleMetrics = useMemo(
    () => metrics.filter(Boolean).slice(0, 3),
    [metrics]
  );

  const visiblePreviewItems = useMemo(
    () => previewItems.filter(Boolean).slice(0, 4),
    [previewItems]
  );

  return (
    <button
      type="button"
      onClick={() => onNavigate?.(route)}
      onFocus={(event) => event.currentTarget.blur()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...cardStyle,
        ...(isHovered ? cardHoverStyle : null),
      }}
    >
      <div style={headerStyle}>
        <div style={iconWrapperStyle}>
          {icon ? (
            <img src={icon} alt="" style={iconStyle} />
          ) : (
            <div style={iconPlaceholderStyle} />
          )}
        </div>

        <div style={titleBlockStyle}>
          <div style={titleStyle}>{title}</div>

          {subtitle ? (
            <div style={subtitleStyle}>{subtitle}</div>
          ) : null}
        </div>
      </div>

      {description ? (
        <div style={descriptionStyle}>{description}</div>
      ) : null}

      {visibleMetrics.length > 0 ? (
        <div style={metricsGridStyle}>
          {visibleMetrics.map((metric) => (
            <div key={metric.label} style={metricItemStyle}>
              <div
                style={{
                  ...metricValueStyle,
                  color: toneColorMap[metric.tone] || "#0F172A",
                }}
              >
                {metric.value ?? "—"}
              </div>

              <div style={metricLabelStyle}>
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {visiblePreviewItems.length > 0 ? (
        <div style={previewBlockStyle}>
          {previewTitle ? (
            <div style={previewTitleStyle}>
              {previewTitle}
            </div>
          ) : null}

          <div style={previewListStyle}>
            {visiblePreviewItems.map((item, index) => {
              const avatarSettings = normalizeAvatarSettings(
                item.avatarSettings
              );

              const avatarRatio =
                PREVIEW_AVATAR_SIZE / PROFILE_AVATAR_SIZE;

              const avatarX =
                (avatarSettings.x || 0) * avatarRatio;

              const avatarY =
                (avatarSettings.y || 0) * avatarRatio;

              const avatarScale =
                avatarSettings.scale || 1;

              return (
                <div
                  key={item.id || item.label || index}
                  style={previewItemStyle}
                >
                  <div style={avatarStyle}>
                    {item.avatarUrl ? (
                      <div style={avatarClipStyle}>
                        <img
                          src={item.avatarUrl}
                          alt=""
                          draggable={false}
                          style={{
                            ...avatarImageStyle,
                            transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarScale})`,
                          }}
                        />
                      </div>
                    ) : (
                      getInitials(item.title)
                    )}
                  </div>

                  <div style={previewTextBlockStyle}>
                    <div style={previewItemTitleStyle}>
                      {item.title || "—"}
                    </div>

                    {item.subtitle ? (
                      <div style={previewItemSubtitleStyle}>
                        {item.subtitle}
                      </div>
                    ) : null}
                  </div>

                  {item.meta ? (
                    <div style={previewMetaStyle}>
                      {item.meta}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div style={footerStyle}>
        <span
          style={{
            ...actionTextStyle,
            ...(isHovered
              ? actionTextHoverStyle
              : null),
          }}
        >
          {actionLabel || "Открыть"} →
        </span>
      </div>
    </button>
  );
}

function getInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "—";

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const cardStyle = {
  width: "100%",
  minHeight: 228,
  padding: "16px 18px",

  display: "flex",
  flexDirection: "column",

  textAlign: "left",

  border: "1px solid transparent",
  borderRadius: 8,

  background: "#FFFFFF",
  boxSizing: "border-box",

  cursor: "pointer",

  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",

  transition:
    "box-shadow 180ms ease, transform 180ms ease, background 180ms ease",

  boxShadow:
    "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04)",
};

const cardHoverStyle = {
  transform: "translateY(-1px)",
  background: "#FFFFFF",
  boxShadow:
    "0 8px 20px rgba(15, 23, 42, 0.07), 0 1px 2px rgba(15, 23, 42, 0.04)",
};

const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
};

const iconWrapperStyle = {
  width: 42,
  height: 42,

  borderRadius: 10,

  background: "#F6F9FF",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  flexShrink: 0,
};

const iconStyle = {
  width: 24,
  height: 24,

  objectFit: "contain",
  display: "block",
};

const iconPlaceholderStyle = {
  width: 16,
  height: 16,
  borderRadius: 5,
  background: "#2563EB",
};

const titleBlockStyle = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  paddingTop: 0,
};

const titleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#0F172A",
  lineHeight: 1.25,
};

const subtitleStyle = {
  marginTop: 3,
  fontSize: 11,
  fontWeight: 500,
  color: "#64748B",
  lineHeight: 1.25,
};

const descriptionStyle = {
  marginTop: 14,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.45,
  color: "#475569",
};

const metricsGridStyle = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  paddingTop: 14,
  borderTop: "1px solid #EDF2F7",
};

const metricItemStyle = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const metricValueStyle = {
  fontSize: 20,
  fontWeight: 800,
  lineHeight: 1,
};

const metricLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: "#64748B",
  lineHeight: 1.25,
};

const previewBlockStyle = {
  marginTop: 16,
  paddingTop: 14,
  borderTop: "1px solid #EDF2F7",
};

const previewTitleStyle = {
  marginBottom: 8,
  fontSize: 11,
  fontWeight: 800,
  color: "#334155",
};

const previewListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const previewItemStyle = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 8,
};

const avatarStyle = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: "#EEF4FF",
  color: "#2563EB",
  fontSize: 9,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const avatarClipStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  overflow: "hidden",
  background: "#E2E8F0",
};

const avatarImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  transformOrigin: "center center",
  userSelect: "none",
  pointerEvents: "none",
};

const previewTextBlockStyle = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const previewItemTitleStyle = {
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  fontSize: 12,
  fontWeight: 700,
  color: "#0F172A",
};

const previewItemSubtitleStyle = {
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  fontSize: 11,
  fontWeight: 500,
  color: "#64748B",
};

const previewMetaStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: "#64748B",
  whiteSpace: "nowrap",
};

const footerStyle = {
  marginTop: "auto",
  paddingTop: 18,
};

const actionTextStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#2563EB",
  lineHeight: 1,
};

const actionTextHoverStyle = {
  color: "#1D4ED8",
};