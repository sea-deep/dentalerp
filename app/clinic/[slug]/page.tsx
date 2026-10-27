import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { BookingRequest } from '@/components/clinic/booking-request'
import { BeforeAfter } from '@/components/clinic/before-after'
import { PatientReview } from '@/components/clinic/patient-review'
export const dynamic = 'force-dynamic'
async function clinic(slug: string) {
  return prisma.hospital.findFirst({
    where: { slug, isActive: true, patientPortalEnabled: true },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      phone: true,
      email: true,
      workingHours: true,
    },
  })
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const hospital = await clinic(slug)
  return {
    title: hospital?.name || 'Clinic unavailable',
    description: hospital
      ? `Services, doctors and appointment requests for ${hospital.name}${hospital.city ? ` in ${hospital.city}` : ''}.`
      : undefined,
    robots: hospital ? undefined : { index: false },
  }
}
export default async function ClinicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params,
    hospital = await clinic(slug)
  if (!hospital) notFound()
  const [services, doctors, entries] = await Promise.all([
    prisma.procedure.findMany({
      where: { hospitalId: hospital.id, isActive: true },
      select: { id: true, name: true, description: true, basePrice: true },
      orderBy: { name: 'asc' },
    }),
    prisma.staff.findMany({
      where: { hospitalId: hospital.id, isActive: true, user: { role: 'DOCTOR', isActive: true } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        qualification: true,
        specialization: true,
      },
      orderBy: { firstName: 'asc' },
    }),
    prisma.websiteEntry.findMany({
      where: { hospitalId: hospital.id, published: true, consentAt: { not: null } },
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        imageUrl: true,
        afterUrl: true,
        rating: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  const gallery = entries.filter((e) => e.kind === 'GALLERY'),
    reviews = entries.filter((e) => e.kind === 'REVIEW')
  let hours: { start?: string; end?: string; lunchStart?: string; lunchEnd?: string } = {}
  try {
    hours = JSON.parse(hospital.workingHours || '{}')
  } catch {}
  const location = [hospital.address, hospital.city, hospital.state, hospital.pincode]
    .filter(Boolean)
    .join(', ')
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: hospital.name,
    telephone: hospital.phone || undefined,
    address: location,
    email: hospital.email,
  }
  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
      />
      <nav
        aria-label="Clinic navigation"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8"
      >
        <Link href={`/clinic/${slug}`} className="font-semibold">
          {hospital.name}
        </Link>
        <div className="flex flex-wrap gap-5 text-sm">
          <a href="#services">Services</a>
          <a href="#doctors">Doctors</a>
          <a href="#visit">Request a visit</a>
          <Link href={`/portal/login?clinic=${slug}`}>Patient portal</Link>
        </div>
      </nav>
      <header className="bg-muted">
        <div className="mx-auto max-w-6xl space-y-6 px-5 py-14 sm:px-8 sm:py-20">
          <h1 className="max-w-5xl break-words text-4xl font-semibold leading-tight sm:text-6xl">
            {hospital.name}
          </h1>
          {hospital.tagline && <p className="max-w-2xl text-xl">{hospital.tagline}</p>}
          <p className="max-w-2xl">{location}</p>
          <div className="flex flex-wrap gap-5">
            <a
              className="inline-flex min-h-11 items-center bg-primary px-5 py-3 font-medium text-primary-foreground"
              href="#visit"
            >
              Request an appointment
            </a>
            {hospital.phone && (
              <a
                className="inline-flex min-h-11 items-center underline underline-offset-4"
                href={`tel:${hospital.phone}`}
              >
                Call {hospital.phone}
              </a>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-20 px-5 py-16 sm:px-8">
        <section id="services" className="space-y-6">
          <h2 className="text-3xl font-semibold">Services</h2>
          <div className="space-y-5">
            {services.map((s) => (
              <div key={s.id} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="text-xl font-medium">{s.name}</h3>
                  {s.description && <p className="mt-1 max-w-2xl">{s.description}</p>}
                </div>
                <p className="tabular-nums">From ₹{Number(s.basePrice).toLocaleString('en-IN')}</p>
              </div>
            ))}
            {!services.length && <p>Contact the clinic for available services and fees.</p>}
          </div>
        </section>
        <section id="doctors" className="space-y-6">
          <h2 className="text-3xl font-semibold">Your doctors</h2>
          {doctors.map((d) => (
            <div key={d.id} className="space-y-1">
              <h3 className="text-xl font-medium">
                Dr. {d.firstName} {d.lastName}
              </h3>
              <p>{[d.qualification, d.specialization].filter(Boolean).join(' · ')}</p>
            </div>
          ))}
          {!doctors.length && <p>Call the clinic for doctor availability.</p>}
        </section>
        {gallery.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-3xl font-semibold">From our clinic</h2>
            <div className="grid gap-8 md:grid-cols-2">
              {gallery.map((e) => (
                <figure key={e.id} className="space-y-3">
                  {e.afterUrl && e.imageUrl ? (
                    <BeforeAfter before={e.imageUrl} after={e.afterUrl} title={e.title} />
                  ) : (
                    <img
                      src={e.imageUrl!}
                      alt={e.title}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <figcaption>
                    <h3 className="text-xl font-medium">{e.title}</h3>
                    {e.body && <p>{e.body}</p>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
        <section className="space-y-6">
          <h2 className="text-3xl font-semibold">Patient experiences</h2>
          {reviews.map((r) => (
            <blockquote key={r.id} className="max-w-3xl space-y-3 bg-muted p-6">
              <p>{r.body}</p>
              <footer>
                {r.title} · {r.rating}/5
              </footer>
            </blockquote>
          ))}
          {!reviews.length && <p>No patient reviews have been published yet.</p>}
          <PatientReview slug={slug} />
        </section>
        <section id="visit" className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div className="space-y-5">
            <h2 className="text-3xl font-semibold">Plan your visit</h2>
            <address className="not-italic">{location}</address>
            {hours.start && hours.end && (
              <p>
                Clinic hours: {hours.start}–{hours.end}
                {hours.lunchStart && hours.lunchEnd
                  ? ` · Break ${hours.lunchStart}–${hours.lunchEnd}`
                  : ''}
                . Availability varies by doctor and holidays.
              </p>
            )}
            <p>
              Verify your mobile number on WhatsApp, choose an available time and send your request.
              The clinic will confirm it.
            </p>
            {hospital.phone && (
              <a href={`tel:${hospital.phone}`} className="block underline">
                {hospital.phone}
              </a>
            )}
          </div>
          <BookingRequest slug={slug} doctors={doctors} />
        </section>
        <footer className="space-y-3 bg-muted p-6">
          <p className="text-2xl font-semibold">{hospital.name}</p>
          <p>{location}</p>
          <a href={`mailto:${hospital.email}`} className="underline">
            {hospital.email}
          </a>
        </footer>
      </div>
    </main>
  )
}
