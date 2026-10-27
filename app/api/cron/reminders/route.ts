import { NextResponse } from 'next/server'
import { processAppointmentAutomation, dispatchWhatsApp } from '@/lib/services/whatsapp.service'
/** Schedule every 5–15 minutes. Only active clinic appointments are processed. */
export async function GET(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const appointments = await processAppointmentAutomation()
    const messages = await dispatchWhatsApp()
    return NextResponse.json({ ...appointments, messages, processedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: 'Reminder processing failed' }, { status: 500 })
  }
}
