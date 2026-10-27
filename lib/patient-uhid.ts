import { randomInt } from 'crypto'
import type { Prisma } from '@prisma/client'
export async function generatePatientUhid(db: Prisma.TransactionClient, hospitalId: string) {
  for (let i = 0; i < 10; i++) {
    const patientId = String(randomInt(10000000, 100000000))
    if (!(await db.patient.findFirst({ where: { hospitalId, patientId }, select: { id: true } })))
      return patientId
  }
  throw new Error('Could not allocate patient ID')
}
