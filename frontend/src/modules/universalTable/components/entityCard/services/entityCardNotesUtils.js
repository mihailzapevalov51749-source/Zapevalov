/**
 * @deprecated Prefer shared/notes/utils/* for editor helpers.
 * Row identity helpers moved to entityCardNoteIdentity.js.
 */

export {
  getEntityIdFromRow as getEntityId,
  getTableIdFromRow as getTableId,
} from "./entityCardNoteIdentity";

export {
  collectMentionPayloadFromHtml,
  getCurrentTimeLabel,
  hasContent,
  stripHtml,
} from "../../../../../shared/notes/utils/noteEditorDom";

export {
  getInitials,
  getPopoverPosition,
  normalizeUser,
  MENTION_POPOVER_HEIGHT,
  MENTION_POPOVER_WIDTH,
} from "../../../../../shared/notes/utils/noteMentionUi";

export { loadSystemUsers } from "../../../../../shared/notes/utils/noteUsersApi";
