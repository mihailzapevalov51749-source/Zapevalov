import {
  DEFAULT_WORKSPACE_LEFT_OFFSET,
  getFullscreenOverlayStyle,
} from "../../../../../shared/notes/styles/entityNotesEditorStyles";

export {
  DEFAULT_WORKSPACE_LEFT_OFFSET as WORKSPACE_LEFT_OFFSET,
  TEXT_COLORS,
  wrapperStyle,
  fullscreenInnerStyle,
  toolbarStyle,
  toolbarLeftStyle,
  toolbarRightStyle,
  toolbarPublishStatusStyle,
  toolbarPublishWarningStatusStyle,
  toolbarButtonStyle,
  toolbarIconStyle,
  colorPopoverStyle,
  colorButtonStyle,
  editorBoxStyle,
  fullscreenEditorBoxStyle,
  editorStyle,
  fullscreenEditorStyle,
  placeholderStyle,
  saveStatusStyle,
  loadingStyle,
  mentionPopoverOverlayStyle,
  mentionPopoverStyle,
  mentionUserButtonStyle,
  mentionAvatarStyle,
  mentionChipStyle,
  publishConfirmOverlayStyle,
  publishConfirmModalStyle,
  publishConfirmTitleStyle,
  publishConfirmTextStyle,
  publishConfirmActionsStyle,
  publishConfirmSecondaryButtonStyle,
  publishConfirmPrimaryButtonStyle,
} from "../../../../../shared/notes/styles/entityNotesEditorStyles";

/** @deprecated Use getFullscreenOverlayStyle(offset) from shared/notes. */
export const fullscreenOverlayStyle = getFullscreenOverlayStyle(
  DEFAULT_WORKSPACE_LEFT_OFFSET,
);
