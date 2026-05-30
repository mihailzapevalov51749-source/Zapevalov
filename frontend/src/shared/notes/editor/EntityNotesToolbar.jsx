import {
  TEXT_COLORS,
  toolbarStyle,
  toolbarLeftStyle,
  toolbarRightStyle,
  toolbarButtonStyle,
  toolbarIconStyle,
  colorPopoverStyle,
  colorButtonStyle,
  toolbarPublishStatusStyle,
  toolbarPublishWarningStatusStyle,
} from "../styles/entityNotesEditorStyles";

import boldIcon from "../../../assets/noteicons/Bold.svg";
import heading2Icon from "../../../assets/noteicons/Heading2.svg";
import heading3Icon from "../../../assets/noteicons/Heading3.svg";
import italicIcon from "../../../assets/noteicons/Italic.svg";
import listIcon from "../../../assets/noteicons/list.svg";
import orderedListIcon from "../../../assets/noteicons/ListOrdered.svg";
import alignCenterIcon from "../../../assets/noteicons/text-align-center.svg";
import alignJustifyIcon from "../../../assets/noteicons/text-align-justify.svg";
import alignLeftIcon from "../../../assets/noteicons/text-align-left.svg";
import alignRightIcon from "../../../assets/noteicons/text-align-right.svg";
import colorTextIcon from "../../../assets/noteicons/colortext.png";
import saveIcon from "../../../assets/icons/save.gif";
import expandIcon from "../../../assets/noteicons/expand.png";
import collapseIcon from "../../../assets/noteicons/collapse.png";

export default function EntityNotesToolbar({
  isFullscreen,
  isPublishing,
  isColorPickerOpen,
  publishStatus = "",
  hasUnpublishedMentions = false,
  colorPickerRef,
  mentionButtonRef,
  onSaveSelection,
  onExec,
  onSelectColor,
  onToggleColorPicker,
  onToggleMention,
  onToggleFullscreen,
  onPublish,
}) {
  const toolbarItems = [
    {
      key: "h2",
      icon: heading2Icon,
      title: "Заголовок H2",
      action: () => onExec("formatBlock", "h2"),
    },
    {
      key: "h3",
      icon: heading3Icon,
      title: "Заголовок H3",
      action: () => onExec("formatBlock", "h3"),
    },
    {
      key: "bold",
      icon: boldIcon,
      title: "Жирный",
      action: () => onExec("bold"),
    },
    {
      key: "italic",
      icon: italicIcon,
      title: "Курсив",
      action: () => onExec("italic"),
    },
    {
      key: "list",
      icon: listIcon,
      title: "Маркированный список",
      action: () => onExec("insertUnorderedList"),
    },
    {
      key: "ordered",
      icon: orderedListIcon,
      title: "Нумерованный список",
      action: () => onExec("insertOrderedList"),
    },
    {
      key: "align-left",
      icon: alignLeftIcon,
      title: "По левому краю",
      action: () => onExec("justifyLeft"),
    },
    {
      key: "align-center",
      icon: alignCenterIcon,
      title: "По центру",
      action: () => onExec("justifyCenter"),
    },
    {
      key: "align-right",
      icon: alignRightIcon,
      title: "По правому краю",
      action: () => onExec("justifyRight"),
    },
    {
      key: "align-justify",
      icon: alignJustifyIcon,
      title: "По ширине",
      action: () => onExec("justifyFull"),
    },
    {
      key: "color",
      icon: colorTextIcon,
      title: "Цвет текста",
      action: onToggleColorPicker,
    },
    {
      key: "mention",
      title: "Упомянуть пользователя",
      isText: true,
      text: "@",
      action: onToggleMention,
    },
  ];

  return (
    <div style={toolbarStyle}>
      <div style={toolbarLeftStyle}>
        {toolbarItems.map((item) => (
          <div
            key={item.key}
            ref={item.key === "color" ? colorPickerRef : null}
            style={{ position: "relative" }}
          >
            <button
              ref={item.key === "mention" ? mentionButtonRef : null}
              type="button"
              title={item.title}
              style={toolbarButtonStyle}
              onMouseDown={(event) => {
                event.preventDefault();
                onSaveSelection();
              }}
              onClick={(event) => item.action(event)}
            >
              {item.isText ? (
                <span
                  style={{
                    color: "#0F172A",
                    fontSize: 16,
                    fontWeight: 500,
                    lineHeight: 1,
                  }}
                >
                  {item.text}
                </span>
              ) : (
                <img src={item.icon} alt="" style={toolbarIconStyle} />
              )}
            </button>

            {item.key === "color" && isColorPickerOpen && (
              <div style={colorPopoverStyle}>
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelectColor(color)}
                    style={{
                      ...colorButtonStyle,
                      background: color,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={toolbarRightStyle}>
        {publishStatus && (
          <div
            style={
              hasUnpublishedMentions
                ? toolbarPublishWarningStatusStyle
                : toolbarPublishStatusStyle
            }
          >
            {publishStatus}
          </div>
        )}

        <button
          type="button"
          title="Сохранить"
          style={toolbarButtonStyle}
          disabled={isPublishing}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onPublish}
        >
          <img
            src={saveIcon}
            alt=""
            style={{
              ...toolbarIconStyle,
              opacity: isPublishing ? 0.45 : 0.9,
            }}
          />
        </button>

        <button
          type="button"
          title={isFullscreen ? "Свернуть" : "Развернуть"}
          style={toolbarButtonStyle}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleFullscreen}
        >
          <img
            src={isFullscreen ? collapseIcon : expandIcon}
            alt=""
            style={toolbarIconStyle}
          />
        </button>
      </div>
    </div>
  );
}
