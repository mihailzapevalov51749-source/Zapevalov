export function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildCompanySearchHaystack(company) {
  return [
    company.id,
    company.original_name,
    company.name,
    company.short_name,
    company.code,
    company.public_slug,
    company.tenant_type,
    company.tenant_status,
    company.platform_version,
    company.template_version,
  ]
    .map(normalizeSearchText)
    .join(" ");
}

export function filterCompaniesBySearch(companies, searchQuery) {
  const query = normalizeSearchText(searchQuery);
  if (!query) {
    return companies;
  }

  return companies.filter((company) => buildCompanySearchHaystack(company).includes(query));
}

export function resolveCompanyOriginalName(company) {
  return String(company?.original_name || company?.name || "").trim();
}

export function resolveCompanyCurrentName(company) {
  return String(company?.name || "").trim();
}
