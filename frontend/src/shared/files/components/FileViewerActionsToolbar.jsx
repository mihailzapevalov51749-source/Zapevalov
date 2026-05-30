import chatIcon from "../../../assets/icons/chat.png";
import closeIcon from "../../../assets/icons/x.svg";

import {
  FILE_VIEWER_ACTIONS_RIGHT_BASE,
  FILE_VIEWER_COMMENTS_PANEL_WIDTH,
} from "./fileViewerDiscussionUtils";

import "./fileViewerActionsToolbar.css";

export default function FileViewerActionsToolbar({
  onClose,
  onToggleComments,
  isCommentsOpen = false,
  showClose = true,
  actionsRightBase = FILE_VIEWER_ACTIONS_RIGHT_BASE,
}) {
  const handleIconMouseEnter = (event) => {
    event.currentTarget.style.opacity = "1";
    event.currentTarget.style.transform = "none";
  };

  const handleIconMouseLeave = (event) => {
    event.currentTarget.style.opacity = "0.82";
    event.currentTarget.style.transform = "none";
  };

  const rightOffset =
    actionsRightBase +
    (isCommentsOpen ? FILE_VIEWER_COMMENTS_PANEL_WIDTH : 0);

  return (
    <div
      className="file-viewer-actions-toolbar"
      style={{ right: rightOffset }}
    >
      {showClose && typeof onClose === "function" ? (
        <button
          type="button"
          className="file-viewer-actions-toolbar__button"
          onClick={onClose}
          title="Закрыть"
          aria-label="Закрыть"
          onMouseEnter={handleIconMouseEnter}
          onMouseLeave={handleIconMouseLeave}
        >
          <img src={closeIcon} alt="" className="file-viewer-actions-toolbar__icon" />
        </button>
      ) : null}

      <button
        type="button"
        className="file-viewer-actions-toolbar__button"
        onClick={onToggleComments}
        title="Комментарии к документу"
        aria-label="Комментарии к документу"
        onMouseEnter={handleIconMouseEnter}
        onMouseLeave={handleIconMouseLeave}
      >
        <img src={chatIcon} alt="" className="file-viewer-actions-toolbar__icon" />
      </button>
    </div>
  );
}
