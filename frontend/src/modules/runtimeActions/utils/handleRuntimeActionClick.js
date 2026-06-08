import { notifyRuntimeActionNotImplemented } from "./notifyRuntimeActionNotImplemented.js";

export function handleRuntimeActionClick(
  { action = null } = {},
  { openActionForm = null } = {},
) {
  const formFields = Array.isArray(action?.form?.fields) ? action.form.fields : [];

  if (formFields.length > 0 && typeof openActionForm === "function") {
    openActionForm(action);
    return;
  }

  notifyRuntimeActionNotImplemented();
}
