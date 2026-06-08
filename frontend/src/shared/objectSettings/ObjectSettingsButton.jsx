import "./objectSettingsStyles.css";

const VARIANT_CLASS = {
  primary: "object-settings-button--primary",
  secondary: "object-settings-button--secondary",
  outline: "object-settings-button--outline",
  ghost: "object-settings-button--ghost",
  danger: "object-settings-button--danger",
};

const SIZE_CLASS = {
  sm: "object-settings-button--sm",
  md: "object-settings-button--md",
};

export default function ObjectSettingsButton({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...buttonProps
}) {
  return (
    <button
      type={type}
      className={[
        "object-settings-button",
        VARIANT_CLASS[variant] || VARIANT_CLASS.secondary,
        SIZE_CLASS[size] || SIZE_CLASS.md,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
