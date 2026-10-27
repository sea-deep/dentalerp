export const modules = [
  'patients',
  'appointments',
  'clinical',
  'billing',
  'reports',
  'communications',
  'inventory',
  'lab',
  'staff',
  'settings',
] as const
export type ClinicModule = (typeof modules)[number]
export type ModuleAccess = Partial<Record<ClinicModule, boolean>>
export function roleAccess(role: string): ModuleAccess {
  const byRole: Record<string, ClinicModule[]> = {
    ADMIN: [...modules],
    DOCTOR: ['patients', 'appointments', 'clinical', 'reports', 'lab'],
    RECEPTIONIST: ['patients', 'appointments', 'billing', 'communications'],
    ACCOUNTANT: ['patients', 'billing', 'reports'],
    LAB_TECH: ['patients', 'lab'],
  }
  return Object.fromEntries(modules.map((m) => [m, byRole[role]?.includes(m) || false]))
}
export function effectiveAccess(role: string, overrides: ModuleAccess = {}): ModuleAccess {
  const base = roleAccess(role)
  return Object.fromEntries(modules.map((m) => [m, !!base[m] && overrides[m] !== false]))
}
export function apiModule(path: string): ClinicModule | null {
  if (/^\/api\/patients\/[^/]+\/(documents|timeline|care-profile)/.test(path)) return 'clinical'
  const prefix = path.split('/')[2]
  if (['patients'].includes(prefix)) return 'patients'
  if (['appointments', 'enquiries', 'video'].includes(prefix)) return 'appointments'
  if (
    [
      'sterilization',
      'treatments',
      'treatment-plans',
      'dental-chart',
      'prescriptions',
      'medications',
      'medicines',
      'clinical-references',
    ].includes(prefix)
  )
    return 'clinical'
  if (
    [
      'invoices',
      'payments',
      'payment-plans',
      'billing',
      'insurance-claims',
      'insurance-providers',
      'pre-authorizations',
    ].includes(prefix)
  )
    return 'billing'
  if (['reports', 'audit-log'].includes(prefix)) return 'reports'
  if (['communications', 'crm', 'loyalty', 'memberships', 'referrals'].includes(prefix))
    return 'communications'
  if (['inventory', 'devices'].includes(prefix)) return 'inventory'
  if (['lab-orders', 'lab-vendors', 'diagnostics'].includes(prefix)) return 'lab'
  if (['staff-invites'].includes(prefix)) return 'staff'
  if (prefix === 'staff') return path === '/api/staff/doctors' ? null : 'staff'
  if (prefix === 'settings')
    return ['/api/settings/clinic', '/api/settings/procedures'].includes(path) ? null : 'settings'
  if (['website', 'data-import'].includes(prefix)) return 'settings'
  if (prefix === 'access') return null
  if (prefix === 'expenses') return 'billing'
  return null
}
export function canReadClinical(user: { role: string; access?: ModuleAccess }) {
  return user.access?.clinical ?? !!roleAccess(user.role).clinical
}
