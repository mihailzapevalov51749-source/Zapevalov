export function buildPageFullRequestParams(options = {}) {
  const params = {};

  if (options.officeAccess === true) {
    params.office_access = true;
  }

  return params;
}
