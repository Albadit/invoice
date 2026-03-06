/** Permission sections for the Manage Permissions modal */
export const permissionSections = [
  {
    key: 'invoice',
    categories: ['dashboard', 'invoices', 'clients', 'companies', 'currencies', 'templates', 'settings'],
  },
  {
    key: 'admin',
    categories: ['users', 'roles'],
  },
] as const;
