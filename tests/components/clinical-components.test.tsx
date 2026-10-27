// @ts-nocheck
/**
 * Clinical Component Tests
 * - DentalChart (interactive dental chart with tooth click, condition dialog)
 * - Dental3DViewer (SVG arch viewer with zoom, fullscreen, tooth inspect)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatEnumLabel: (value?: string | null) =>
    value
      ? value
          .toLowerCase()
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      : 'Unknown',
}))

vi.mock('lucide-react', async (importOriginal) => {
  const icon = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement('svg', { ...props, ref, 'data-testid': `lucide-${name}` })
    )
  const actual = (await importOriginal()) as any
  const handler = { get: (_: any, p: string) => actual[p] || icon(p) }
  return new Proxy(actual, handler)
})

vi.mock('date-fns', () => ({
  format: (date: any, fmt: string) => new Date(date).toLocaleDateString(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

// UI mocks
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardDescription: ({ children }: any) => <p data-testid="card-desc">{children}</p>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: React.forwardRef(({ children, onClick, disabled, variant, ...rest }: any, ref: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} ref={ref} {...rest}>
      {children}
    </button>
  )),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}))

let dialogOpen = false
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => {
    dialogOpen = open
    return (
      <div data-testid="dialog" data-open={String(!!open)}>
        {open ? children : null}
      </div>
    )
  },
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span />,
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid={`checkbox-${id}`}
    />
  ),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div role="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
}))

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { DentalChart } from '@/components/dental-chart/dental-chart'

// ---------------------------------------------------------------------------
// DentalChart Tests
// ---------------------------------------------------------------------------
describe('DentalChart', () => {
  const mockChartData = {
    11: [
      {
        id: 'e1',
        toothNumber: 11,
        toothNotation: '11',
        condition: 'CARIES',
        severity: 'MODERATE',
        mesial: true,
        distal: false,
        occlusal: false,
        buccal: false,
        lingual: false,
        notes: 'Deep caries',
        diagnosedDate: '2026-01-15',
        resolvedDate: null,
      },
    ],
    21: [
      {
        id: 'e2',
        toothNumber: 21,
        toothNotation: '21',
        condition: 'FILLED',
        severity: 'MILD',
        mesial: false,
        distal: false,
        occlusal: true,
        buccal: false,
        lingual: false,
        notes: '',
        diagnosedDate: '2025-12-01',
        resolvedDate: null,
      },
    ],
    36: [
      {
        id: 'e3',
        toothNumber: 36,
        toothNotation: '36',
        condition: 'MISSING',
        severity: 'SEVERE',
        mesial: false,
        distal: false,
        occlusal: false,
        buccal: false,
        lingual: false,
        notes: '',
        diagnosedDate: '2025-06-01',
        resolvedDate: null,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ chartData: mockChartData }),
    } as Response)
  })

  const tooth = (number: number) =>
    screen.getByRole('button', { name: new RegExp('^Tooth ' + number + ' [(]') })
  const loaded = () => screen.findByRole('heading', { name: 'Dental chart', exact: true })

  it('shows an accessible loading state', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
    render(<DentalChart patientId="p1" />)
    expect(screen.getByLabelText('Loading dental chart')).toHaveAttribute('aria-busy', 'true')
  })
  it('loads the patient chart without reusing a cached response', async () => {
    render(<DentalChart patientId="p1" />)
    await loaded()
    expect(fetch).toHaveBeenCalledWith('/api/dental-chart?patientId=p1', { cache: 'no-store' })
  })
  it('shows permanent teeth in patient orientation', async () => {
    render(<DentalChart patientId="p1" />)
    await loaded()
    expect(screen.getByText('Patient’s right')).toBeInTheDocument()
    expect(screen.getByText('Patient’s left')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-tooth]')).toHaveLength(32)
  })
  it('provides a complete condition legend', async () => {
    render(<DentalChart patientId="p1" />)
    await loaded()
    const legend = screen.getByLabelText('Condition legend')
    expect(legend).toHaveTextContent('Not charted')
    expect(legend).toHaveTextContent('Caries')
    expect(legend).toHaveTextContent('Root canal')
    expect(legend).toHaveTextContent('Periodontal')
  })
  it('shows real findings rather than inferring all remaining teeth are present', async () => {
    render(<DentalChart patientId="p1" />)
    await loaded()
    expect(screen.getByText('teeth charted').parentElement).toHaveTextContent('3 / 32')
    expect(screen.queryByText('Present Teeth')).not.toBeInTheDocument()
  })
  it('selects a tooth into the inspector without a modal', async () => {
    render(<DentalChart patientId="p1" />)
    await loaded()
    fireEvent.click(tooth(11))
    expect(screen.getByRole('heading', { name: 'Tooth 11' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tooth finding details')).toHaveTextContent('Deep caries')
  })
  it('does not open a blank finding form over an existing record', async () => {
    render(<DentalChart patientId="p1" />)
    await loaded()
    fireEvent.click(tooth(11))
    expect(screen.getByRole('button', { name: 'Add finding' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Condition')).not.toBeInTheDocument()
  })
  it('pre-fills an explicitly edited finding including affected surfaces', async () => {
    render(<DentalChart patientId="p1" />)
    await loaded()
    fireEvent.click(tooth(11))
    fireEvent.click(screen.getByRole('button', { name: 'Edit finding' }))
    expect(screen.getByLabelText('Condition')).toHaveValue('CARIES')
    expect(screen.getByLabelText('Severity')).toHaveValue('MODERATE')
    expect(screen.getByRole('button', { name: 'Mesial', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByLabelText('Clinical notes')).toHaveValue('Deep caries')
  })
  it('starts an uncharted tooth with no assumed diagnosis or surfaces', async () => {
    render(<DentalChart patientId="p1" />)
    await loaded()
    fireEvent.click(tooth(12))
    expect(screen.getByLabelText('Condition')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Save finding' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mesial', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })
  it('renders primary dentition with twenty teeth', async () => {
    render(<DentalChart patientId="p1" />)
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Primary', exact: true }))
    expect(document.querySelectorAll('[data-tooth]')).toHaveLength(20)
    expect(tooth(55)).toBeInTheDocument()
    expect(screen.getByText('teeth charted').parentElement).toHaveTextContent('0 / 20')
  })
  it('renders mixed dentition and Universal labels', async () => {
    render(<DentalChart patientId="p1" />)
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Mixed', exact: true }))
    fireEvent.change(screen.getByLabelText('Tooth notation'), { target: { value: 'UNIVERSAL' } })
    expect(document.querySelectorAll('[data-tooth]')).toHaveLength(52)
    expect(screen.getByRole('button', { name: /^Tooth A / })).toBeInTheDocument()
  })
  it('toggles selected teeth for treatment recording', async () => {
    const onSelect = vi.fn()
    render(<DentalChart patientId="p1" selectedTeeth={[11]} onTeethSelect={onSelect} />)
    await loaded()
    fireEvent.click(tooth(12))
    expect(onSelect).toHaveBeenCalledWith([11, 12])
    fireEvent.click(tooth(11))
    expect(onSelect).toHaveBeenLastCalledWith([])
  })
  it('keeps resolved findings accessible in tooth history', () => {
    render(
      <DentalChart
        patientId="p1"
        entries={[{ ...mockChartData[11][0], resolvedDate: '2026-02-01' }]}
      />
    )
    fireEvent.click(tooth(11))
    fireEvent.click(screen.getByRole('button', { name: 'Resolved history (1)' }))
    expect(screen.getByText('Resolved 1/2/2026')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Dental3DViewer Tests (SVG-based viewer)
// ---------------------------------------------------------------------------
import Dental3DViewer from '@/components/imaging/dental-3d-viewer'

describe('Dental3DViewer', () => {
  const mockChartData = [
    { toothNumber: 11, condition: 'HEALTHY' },
    { toothNumber: 21, condition: 'CARIES', severity: 'MODERATE', notes: 'Deep cavity' },
    { toothNumber: 36, condition: 'MISSING' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ chartData: {} }),
    } as Response)
  })

  it('renders without crashing', () => {
    render(<Dental3DViewer patientId="p1" chartData={mockChartData} />)
    expect(screen.getByText('Interactive Dental Viewer')).toBeInTheDocument()
  })

  it('renders SVG element', () => {
    const { container } = render(<Dental3DViewer patientId="p1" chartData={mockChartData} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    // SVG should have a viewBox attribute
    expect(svg?.getAttribute('viewBox')).toContain('0 0')
  })

  it('renders view angle buttons (Full, Upper, Lower)', () => {
    render(<Dental3DViewer patientId="p1" chartData={mockChartData} />)
    expect(screen.getByText('Full')).toBeInTheDocument()
    expect(screen.getByText('Upper')).toBeInTheDocument()
    expect(screen.getByText('Lower')).toBeInTheDocument()
  })

  it('renders zoom and control buttons', () => {
    render(<Dental3DViewer patientId="p1" chartData={mockChartData} />)
    const buttons = screen.getAllByRole('button')
    // Full, Upper, Lower, ZoomIn, ZoomOut, Reset, Fullscreen = 7+
    expect(buttons.length).toBeGreaterThanOrEqual(7)
  })

  it('renders condition legend', () => {
    render(<Dental3DViewer patientId="p1" chartData={mockChartData} />)
    expect(screen.getByText('Legend')).toBeInTheDocument()
    // Condition names may appear in both legend and overview panel
    expect(screen.getAllByText('Healthy').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Caries').length).toBeGreaterThanOrEqual(1)
  })

  it('shows overview panel with present teeth count', () => {
    render(<Dental3DViewer patientId="p1" chartData={mockChartData} />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Present Teeth')).toBeInTheDocument()
    // 32 - 1 MISSING = 31
    expect(screen.getByText('31/32')).toBeInTheDocument()
  })

  it('renders SVG with viewBox for arch layout', () => {
    const { container } = render(<Dental3DViewer patientId="p1" chartData={mockChartData} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    const viewBox = svg?.getAttribute('viewBox') || ''
    // Front view: viewBox starts with "0 0 620"
    expect(viewBox).toMatch(/^0 0 \d+ \d+$/)
  })

  it('renders in readOnly mode without crash', () => {
    render(<Dental3DViewer patientId="p1" chartData={mockChartData} readOnly />)
    expect(screen.getByText('Interactive Dental Viewer')).toBeInTheDocument()
  })

  it('handles empty chart data gracefully', () => {
    render(<Dental3DViewer patientId="p1" chartData={[]} />)
    expect(screen.getByText('Interactive Dental Viewer')).toBeInTheDocument()
    // With empty data, all teeth are healthy → present count = 32/32
    expect(screen.getByText('32/32')).toBeInTheDocument()
  })

  it('shows condition stats from chart data', () => {
    render(<Dental3DViewer patientId="p1" chartData={mockChartData} />)
    // Should show Missing count in overview
    expect(screen.getAllByText('Missing').length).toBeGreaterThanOrEqual(1)
  })

  it('renders card title for the viewer', () => {
    render(<Dental3DViewer patientId="p1" chartData={mockChartData} />)
    expect(screen.getByText('Interactive Dental Viewer')).toBeInTheDocument()
    // Verify overview section with stat counts
    expect(screen.getByText('Present Teeth')).toBeInTheDocument()
  })
})
