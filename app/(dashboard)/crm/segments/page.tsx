'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CardDescription } from '@/components/ui/card'
import { UserPlus, Users, Crown, AlertTriangle, UserX, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PatientInfo {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  lastVisit: string | null
  totalSpend: number
}

interface Segment {
  count: number
  patients: PatientInfo[]
}

interface SegmentData {
  segments: {
    new: Segment
    active: Segment
    loyal: Segment
    atRisk: Segment
    lost: Segment
    highValue: Segment
  }
  totalPatients: number
}

const SEGMENT_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bgColor: string; description: string }
> = {
  new: {
    label: 'New Patients',
    icon: UserPlus,
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/40 dark:border-cyan-900',
    description: 'Registered in last 3 months',
  },
  active: {
    label: 'Active',
    icon: Users,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-900',
    description: 'Visited in last 3 months',
  },
  loyal: {
    label: 'Loyal',
    icon: Crown,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900',
    description: 'Frequent visitors (4+ visits/year)',
  },
  atRisk: {
    label: 'At Risk',
    icon: AlertTriangle,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900',
    description: 'No visit in 3-6 months',
  },
  lost: {
    label: 'Lost',
    icon: UserX,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900',
    description: 'No visit in 6+ months',
  },
  highValue: {
    label: 'High Value',
    icon: TrendingUp,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-900',
    description: 'Top 20% by spending',
  },
}

export default function SegmentsPage() {
  const [data, setData] = useState<SegmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('new')
  const { toast } = useToast()

  useEffect(() => {
    async function fetchSegments() {
      try {
        const res = await fetch('/api/crm/segments')
        if (!res.ok) throw new Error('Failed to fetch')
        setData(await res.json())
      } catch {
        toast({ title: 'Failed to load segments', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchSegments()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Patient Segments</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const segments = data?.segments

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patient Segments</h1>
          <p className="text-muted-foreground mt-1">
            {data?.totalPatients || 0} total active patients
          </p>
        </div>
      </div>

      {/* Segment Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(SEGMENT_CONFIG).map(([key, config]) => {
          const segment = segments?.[key as keyof typeof segments]
          const Icon = config.icon
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-shadow hover:shadow-md ${activeTab === key ? config.bgColor : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-xs font-medium truncate">{config.label}</span>
                </div>
                <div className="text-2xl font-bold">{segment?.count || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Segment Detail Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 gap-1 sm:grid-cols-6">
          {Object.entries(SEGMENT_CONFIG).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(SEGMENT_CONFIG).map(([key, config]) => {
          const segment = segments?.[key as keyof typeof segments]
          return (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <config.icon className={`h-5 w-5 ${config.color}`} />
                    {config.label}
                    <Badge variant="outline">{segment?.count || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!segment || segment.patients.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No patients in this segment
                    </p>
                  ) : (
                    <>
                      <div className="divide-y md:hidden">
                        {segment.patients.map((patient) => (
                          <div key={patient.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {patient.firstName} {patient.lastName}
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {patient.patientId}
                                </p>
                              </div>
                              <p className="shrink-0 font-medium tabular-nums">
                                ₹{patient.totalSpend.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {patient.phone && <span>{patient.phone}</span>}
                              <span>
                                Last visit:{' '}
                                {patient.lastVisit
                                  ? new Date(patient.lastVisit).toLocaleDateString('en-IN')
                                  : 'Never'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Patient ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Last Visit</TableHead>
                              <TableHead className="text-right">Total Spend</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {segment.patients.map((patient) => (
                              <TableRow key={patient.id}>
                                <TableCell className="font-mono text-sm">
                                  {patient.patientId}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {patient.firstName} {patient.lastName}
                                </TableCell>
                                <TableCell>{patient.phone}</TableCell>
                                <TableCell>
                                  {patient.lastVisit
                                    ? new Date(patient.lastVisit).toLocaleDateString('en-IN')
                                    : 'Never'}
                                </TableCell>
                                <TableCell className="text-right">
                                  ₹{patient.totalSpend.toLocaleString('en-IN')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
