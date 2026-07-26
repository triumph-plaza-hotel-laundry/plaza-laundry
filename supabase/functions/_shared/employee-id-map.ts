/** Legacy role-prefixed laundry ids → permanent EMP-XXXX (edge + client). */
export const LEGACY_EMPLOYEE_ID_MAP: Record<string, string> = {
  'gm-01': 'EMP-0001',
  'dm-01': 'EMP-0002',
  'ws-01': 'EMP-0003',
  'dm-02': 'EMP-0004',
  'dm-03': 'EMP-0005',
  'wts-01': 'EMP-0006',
  'tl-01': 'EMP-0007',
  'wts-02': 'EMP-0008',
  'wts-03': 'EMP-0009',
  'ws-02': 'EMP-0010',
  'lw-06': 'EMP-0011',
  'lw-01': 'EMP-0012',
  'lw-02': 'EMP-0013',
  'lw-03': 'EMP-0014',
  'lw-04': 'EMP-0015',
  'lw-05': 'EMP-0016',
  'lw-07': 'EMP-0017',
  'lw-08': 'EMP-0018',
  'lw-09': 'EMP-0019',
  'lw-10': 'EMP-0020',
};

export function resolvePermanentEmployeeId(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return raw;
  return LEGACY_EMPLOYEE_ID_MAP[raw] ?? raw;
}
