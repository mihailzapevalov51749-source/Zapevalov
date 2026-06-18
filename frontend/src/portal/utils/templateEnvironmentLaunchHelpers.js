export const TEMPLATE_ENVIRONMENT_KEY = "TEMPLATE";

export function shouldShowOpenTemplateButton(environment) {
  return environment?.environment_key === TEMPLATE_ENVIRONMENT_KEY;
}
