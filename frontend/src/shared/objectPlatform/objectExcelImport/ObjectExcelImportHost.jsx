import { useEffect, useState } from "react";

import { subscribeObjectExcelImportOpen } from "../services/import/objectTableImportBridge.js";
import ObjectExcelImportModal from "./ObjectExcelImportModal.jsx";

export default function ObjectExcelImportHost() {
  const [state, setState] = useState({
    open: false,
    snapshot: null,
  });

  useEffect(
    () =>
      subscribeObjectExcelImportOpen(({ snapshot }) => {
        setState({
          open: true,
          snapshot: snapshot || null,
        });
      }),
    [],
  );

  return (
    <ObjectExcelImportModal
      open={state.open}
      snapshot={state.snapshot}
      onClose={() =>
        setState({
          open: false,
          snapshot: null,
        })
      }
    />
  );
}
