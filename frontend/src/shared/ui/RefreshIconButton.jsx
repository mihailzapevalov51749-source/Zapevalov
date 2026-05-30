import updateIcon from "../../assets/icons/update.png";

import "./refreshIconButton.css";

export default function RefreshIconButton({
  onClick,
  disabled = false,
  title = "Обновить",
  spinning = false,
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`refresh-icon-button${className ? ` ${className}` : ""}`}
      title={title}
      aria-label={title}
    >
      <img
        src={updateIcon}
        alt=""
        className={`refresh-icon-button__icon${spinning ? " is-spinning" : ""}`}
      />
    </button>
  );
}
