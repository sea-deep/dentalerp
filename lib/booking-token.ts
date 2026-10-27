import { SignJWT, jwtVerify } from 'jose'
function secret() {
  if (!process.env.NEXTAUTH_SECRET) throw new Error('Authentication secret not configured')
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
}
export async function createBookingToken(id: string, hospitalId: string, phone: string) {
  return new SignJWT({ id, hospitalId, phone, purpose: 'booking' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(secret())
}
export async function readBookingToken(token: string) {
  const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
  if (
    payload.purpose !== 'booking' ||
    typeof payload.id !== 'string' ||
    typeof payload.hospitalId !== 'string' ||
    typeof payload.phone !== 'string'
  )
    throw new Error('Invalid booking verification')
  return payload as { id: string; hospitalId: string; phone: string }
}
