import { colord, extend } from 'colord'
import a11yPlugin from 'colord/plugins/a11y'

extend([a11yPlugin])

interface ColorPair {
  name: string
  fg: string
  bg: string
  expectedLevel: 'AA' | 'AAA'
  isLargeText?: boolean
  isUiComponent?: boolean
}

// Color palettes for DentalERP. Keep these values in sync with the CSS custom
// properties in app/globals.css — this audit is what proves the tokens we ship
// actually meet WCAG 2.1 contrast requirements.
export const LIGHT_THEME = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#0E7490', // Cyan-700 / Medical Cyan (CR >= 4.5:1 with white)
  onPrimary: '#FFFFFF',
  // Dental Enamel
  enamel: '#FFFFFF',
  enamelStroke: '#CBD5E1',
  enamelFill: '#F8FAFC',
  // Clinical Conditions
  caries: '#DC2626', // Red-600
  cariesBg: '#FEF2F2',
  cariesBorder: '#FECACA',
  cariesText: '#991B1B',

  filled: '#2563EB', // Blue-600
  filledBg: '#EFF6FF',
  filledBorder: '#BFDBFE',
  filledText: '#1E40AF',

  healthy: '#059669', // Emerald-600
  healthyBg: '#ECFDF5',
  healthyBorder: '#A7F3D0',
  healthyText: '#065F46',

  crown: '#D97706', // Amber-600
  crownBg: '#FFFBEB',
  crownBorder: '#FDE68A',
  crownText: '#92400E',

  rootCanal: '#7C3AED', // Violet-600
  rootCanalBg: '#F5F3FF',
  rootCanalBorder: '#DDD6FE',
  rootCanalText: '#5B21B6',

  missing: '#64748B', // Slate-500
  missingBg: '#F1F5F9',
  missingBorder: '#CBD5E1',
  missingText: '#334155',
}

export const DARK_THEME = {
  bg: '#020817', // hsl(222.2 84% 4.9%) — matches --background
  card: '#020817', // hsl(222.2 84% 4.9%) — matches --card
  cardBorder: '#1E293B', // hsl(217.2 32.6% 17.5%) — matches --border
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  primary: '#22D3EE', // Cyan-400
  onPrimary: '#0F172A',
  // Dental Enamel in dark mode
  enamel: '#1E293B', // Subtle slate surface, not blinding white
  enamelStroke: '#334155',
  enamelFill: '#1E293B',
  // Clinical Conditions - Dark mode calibrated
  caries: '#F87171', // Red-400
  cariesBg: '#450A0A', // Deep dark red
  cariesBorder: '#7F1D1D',
  cariesText: '#FECACA',

  filled: '#60A5FA', // Blue-400
  filledBg: '#172554', // Deep dark blue
  filledBorder: '#1E3A8A',
  filledText: '#BFDBFE',

  healthy: '#34D399', // Emerald-400
  healthyBg: '#064E3B', // Deep dark emerald
  healthyBorder: '#065F46',
  healthyText: '#A7F3D0',

  crown: '#FBBF24', // Amber-400
  crownBg: '#451A03',
  crownBorder: '#78350F',
  crownText: '#FDE68A',

  rootCanal: '#A78BFA', // Violet-400
  rootCanalBg: '#2E1065',
  rootCanalBorder: '#4C1D95',
  rootCanalText: '#DDD6FE',

  missing: '#94A3B8', // Slate-400
  missingBg: '#1E293B',
  missingBorder: '#334155',
  missingText: '#E2E8F0',
}

export function auditThemeColors() {
  const tests: ColorPair[] = [
    // LIGHT THEME CHECKS
    {
      name: 'Light Card Text Primary',
      fg: LIGHT_THEME.textPrimary,
      bg: LIGHT_THEME.card,
      expectedLevel: 'AAA',
    },
    {
      name: 'Light Card Text Secondary',
      fg: LIGHT_THEME.textSecondary,
      bg: LIGHT_THEME.card,
      expectedLevel: 'AA',
    },
    {
      name: 'Light Primary Button Text',
      fg: LIGHT_THEME.onPrimary,
      bg: LIGHT_THEME.primary,
      expectedLevel: 'AA',
    },
    {
      name: 'Light Destructive Button Text',
      fg: LIGHT_THEME.onPrimary,
      bg: LIGHT_THEME.caries, // destructive token: hsl(0 72% 51%) ≈ red-600
      expectedLevel: 'AA',
    },
    {
      name: 'Light Muted Text on Background',
      fg: LIGHT_THEME.textMuted,
      bg: LIGHT_THEME.bg,
      expectedLevel: 'AA',
    },
    {
      name: 'Light Healthy Badge Text',
      fg: LIGHT_THEME.healthyText,
      bg: LIGHT_THEME.healthyBg,
      expectedLevel: 'AA',
    },
    {
      name: 'Light Caries Badge Text',
      fg: LIGHT_THEME.cariesText,
      bg: LIGHT_THEME.cariesBg,
      expectedLevel: 'AA',
    },
    {
      name: 'Light Filled Badge Text',
      fg: LIGHT_THEME.filledText,
      bg: LIGHT_THEME.filledBg,
      expectedLevel: 'AA',
    },
    {
      name: 'Light Crown Badge Text',
      fg: LIGHT_THEME.crownText,
      bg: LIGHT_THEME.crownBg,
      expectedLevel: 'AA',
    },
    {
      name: 'Light Root Canal Badge Text',
      fg: LIGHT_THEME.rootCanalText,
      bg: LIGHT_THEME.rootCanalBg,
      expectedLevel: 'AA',
    },
    {
      name: 'Light Missing Badge Text',
      fg: LIGHT_THEME.missingText,
      bg: LIGHT_THEME.missingBg,
      expectedLevel: 'AA',
    },

    // DARK THEME CHECKS
    {
      name: 'Dark Card Text Primary',
      fg: DARK_THEME.textPrimary,
      bg: DARK_THEME.card,
      expectedLevel: 'AAA',
    },
    {
      name: 'Dark Card Text Secondary',
      fg: DARK_THEME.textSecondary,
      bg: DARK_THEME.card,
      expectedLevel: 'AA',
    },
    {
      name: 'Dark Primary Button Text',
      fg: DARK_THEME.onPrimary,
      bg: DARK_THEME.primary,
      expectedLevel: 'AAA',
    },
    {
      name: 'Dark Destructive Button Text',
      fg: DARK_THEME.onPrimary,
      bg: DARK_THEME.caries,
      expectedLevel: 'AA',
    },
    {
      name: 'Dark Muted Text on Background',
      fg: DARK_THEME.textMuted,
      bg: DARK_THEME.bg,
      expectedLevel: 'AA',
    },
    {
      name: 'Dark Healthy Badge Text',
      fg: DARK_THEME.healthyText,
      bg: DARK_THEME.healthyBg,
      expectedLevel: 'AA',
    },
    {
      name: 'Dark Caries Badge Text',
      fg: DARK_THEME.cariesText,
      bg: DARK_THEME.cariesBg,
      expectedLevel: 'AA',
    },
    {
      name: 'Dark Filled Badge Text',
      fg: DARK_THEME.filledText,
      bg: DARK_THEME.filledBg,
      expectedLevel: 'AA',
    },
    {
      name: 'Dark Crown Badge Text',
      fg: DARK_THEME.crownText,
      bg: DARK_THEME.crownBg,
      expectedLevel: 'AA',
    },
    {
      name: 'Dark Root Canal Badge Text',
      fg: DARK_THEME.rootCanalText,
      bg: DARK_THEME.rootCanalBg,
      expectedLevel: 'AA',
    },
    {
      name: 'Dark Missing Badge Text',
      fg: DARK_THEME.missingText,
      bg: DARK_THEME.missingBg,
      expectedLevel: 'AA',
    },
  ]

  let passed = 0
  let failed = 0

  console.log('='.repeat(70))
  console.log(' DETERMINISTIC UI/UX COLOR CONTRAST AUDIT (WCAG 2.1 AA / AAA)')
  console.log('='.repeat(70))

  for (const t of tests) {
    const contrast = colord(t.fg).contrast(t.bg)
    const isAA = contrast >= (t.isLargeText || t.isUiComponent ? 3.0 : 4.5)
    const isAAA = contrast >= (t.isLargeText ? 4.5 : 7.0)
    const pass = t.expectedLevel === 'AAA' ? isAAA : isAA

    const icon = pass ? '✅ PASS' : '❌ FAIL'
    console.log(
      `${icon} | ${t.name.padEnd(30)} | CR: ${contrast.toFixed(2)}:1 | Req: ${t.expectedLevel} | FG: ${t.fg} on BG: ${t.bg}`
    )
    if (pass) passed++
    else failed++
  }

  console.log('-'.repeat(70))
  console.log(`Results: ${passed} Passed, ${failed} Failed out of ${tests.length} tests`)
  console.log('='.repeat(70))

  return { passed, failed, total: tests.length }
}

if (require.main === module) {
  const { failed } = auditThemeColors()
  process.exit(failed > 0 ? 1 : 0)
}
