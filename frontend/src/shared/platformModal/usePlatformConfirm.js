import { useContext } from "react";

import { PlatformConfirmContext } from "./PlatformConfirmProvider";

export default function usePlatformConfirm() {
  const confirm = useContext(PlatformConfirmContext);

  if (!confirm) {
    throw new Error(
      "usePlatformConfirm must be used within PlatformConfirmProvider",
    );
  }

  return confirm;
}
