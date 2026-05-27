// client/src/utils/permissionAudit.js
export const parsePermissionAuditDetails = (details) => {
  if (!details) return null;
  if (typeof details === 'object') return details;
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch (error) {
      return null;
    }
  }
  return null;
};

export const getPermissionAuditChanges = (details) => {
  const parsed = parsePermissionAuditDetails(details);
  if (!parsed) return [];

  const changes = parsed.changed || parsed.permission_changes || [];
  const unmapped = parsed.unmapped_changes || [];
  const out = [];
  if (Array.isArray(changes)) out.push(...changes);
  if (Array.isArray(unmapped)) out.push(...unmapped.map(u => `(Không xác định) ${u}`));
  return out;
};
