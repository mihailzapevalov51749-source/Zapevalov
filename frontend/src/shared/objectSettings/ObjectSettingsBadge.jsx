const VARIANT_CLASS = {
  default: "object-settings-badge--default",
  system: "object-settings-badge--system",
  key: "object-settings-badge--key",
  status: "object-settings-badge--status",
  count: "object-settings-badge--count",
  stat: "object-settings-badge--stat",
};

export default function ObjectSettingsBadge({
  children,
  variant = "default",
  className = "",
  title = "",
}) {
  const Tag = variant === "key" ? "code" : "span";

  return (
    <Tag
      className={[
        "object-settings-badge",
        VARIANT_CLASS[variant] || VARIANT_CLASS.default,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={title || undefined}
    >
      {children}
    </Tag>
  );
}
