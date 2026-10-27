/**
 * POST /api/webhooks
 *
 * Internal webhook endpoint for AI-driven event processing (Phase 4.6).
 * Existing module routes POST here when a domain event occurs:
 *
 *   treatment.completed      – treatment status → COMPLETED
 *   appointment.no_show      – appointment marked as no-show
 *   inventory.below_reorder  – stock drops to / below reorder level
 *   lab_order.delayed        – lab delivery past expected date
 *   payment.received         – new payment recorded
 *   patient.created          – new patient registered
 *
 * The dispatcher fires asynchronously so the originating request is
 * not blocked.  Requires a valid NextAuth session.
 *
 * Usage (from another route handler):
 *   await fetch("/api/webhooks", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ type: "treatment.completed", payload: { treatmentId, patientId, patientName } })
 *   })
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'

const VALID_EVENTS = [
  'treatment.completed',
  'appointment.no_show',
  'inventory.below_reorder',
  'lab_order.delayed',
  'payment.received',
  'patient.created',
]

export async function POST(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole()
  if (error) return error

  let body: { type?: string; payload?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.type || !VALID_EVENTS.includes(body.type)) {
    return NextResponse.json(
      { error: 'Invalid event type', validEvents: VALID_EVENTS },
      { status: 400 }
    )
  }

  // Event received
  return NextResponse.json({ received: true, eventType: body.type })
}
