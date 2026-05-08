import { createPortal } from "react-dom";

import EntityCardView from "./EntityCardView";

import {
  entityCardOverlayStyle,
  entityCardModalStyle,
} from "./styles/entityCardModalStyles";

export default function EntityCardModal({
  row,
  columns = [],
  table,
  onClose,
}) {
  if (!row) return null;

  return createPortal(
    <div style={entityCardOverlayStyle} onMouseDown={onClose}>
      <div
        style={entityCardModalStyle}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <EntityCardView
          row={row}
          table={table}
          columns={columns}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body
  );
}