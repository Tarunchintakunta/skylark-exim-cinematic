import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Send } from 'lucide-react'
import { scrollRef, useStore } from '@/store/useStore'
import { chapters, clamp01, smoothstep } from '@/timeline/chapters'

const PRODUCTS = ['Swordfish', 'Tuna', 'Shrimp', 'Other ocean fish'] as const
const FORMS = ['HOSO', 'HLSO', 'PUD', 'PTO'] as const
const GRADES = ['10/20', '21/25', '26/30', '31/40', '41/50', 'Whole / by weight', 'Loins & portions'] as const
const DOCS = [
  'Health certificate',
  'Packing list',
  'Certificate of origin',
  'Residue certificate',
  'Compliance records',
  'HACCP / EIC documents',
] as const
const PACKAGING = [
  'IQF, inner poly + master carton',
  'Block frozen, master carton',
  'Vacuum packed retail',
  'Bulk, buyer specification',
] as const

const schema = z
  .object({
    products: z.array(z.enum(PRODUCTS)).min(1, 'Select at least one product'),
    shrimpForms: z.array(z.enum(FORMS)),
    grade: z.string().min(1, 'Select a size grade'),
    market: z.string().min(2, 'Enter the destination market'),
    quantity: z.string().min(1, 'Enter an indicative quantity'),
    packaging: z.string().min(1, 'Select a packaging preference'),
    documents: z.array(z.enum(DOCS)).min(1, 'Select the documents you require'),
    name: z.string().min(2, 'Enter your name'),
    company: z.string().min(2, 'Enter your company'),
    email: z.string().email('Enter a valid business email'),
    whatsapp: z.string().optional(),
    message: z.string().max(1200).optional(),
  })
  .refine((d) => !d.products.includes('Shrimp') || d.shrimpForms.length > 0, {
    message: 'Choose at least one shrimp form',
    path: ['shrimpForms'],
  })

export type RFQValues = z.infer<typeof schema>

export function RFQ() {
  const wrap = useRef<HTMLDivElement>(null)
  const sent = useStore((s) => s.rfqSent)
  const setSent = useStore((s) => s.setRfqSent)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RFQValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      products: [],
      shrimpForms: [],
      grade: '',
      market: '',
      quantity: '',
      packaging: '',
      documents: ['Health certificate', 'Residue certificate'],
      name: '',
      company: '',
      email: '',
      whatsapp: '',
      message: '',
    },
  })

  const products = watch('products')
  const needsForms = products?.includes('Shrimp')

  useEffect(() => {
    const c = chapters.find((x) => x.id === 'c18-rfq')!
    let raf = 0
    const tick = () => {
      const p = scrollRef.current
      const a = clamp01(smoothstep((p - (c.start + (c.end - c.start) * 0.02)) / 0.020))
      const el = wrap.current
      if (el) {
        el.style.opacity = String(a)
        el.style.transform = `translateY(${(1 - a) * 40}px)`
        el.style.pointerEvents = a > 0.9 ? 'auto' : 'none'
        el.style.visibility = a < 0.01 ? 'hidden' : 'visible'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const onSubmit = async (values: RFQValues) => {
    // No backend is wired in this build. The payload is validated, logged and
    // handed to a mail client so nothing a buyer types is silently discarded.
    const body = [
      `Product interest: ${values.products.join(', ')}`,
      values.shrimpForms.length ? `Shrimp form: ${values.shrimpForms.join(', ')}` : '',
      `Size grade: ${values.grade}`,
      `Destination market: ${values.market}`,
      `Quantity: ${values.quantity}`,
      `Packaging: ${values.packaging}`,
      `Documents required: ${values.documents.join(', ')}`,
      '',
      `Buyer: ${values.name}`,
      `Company: ${values.company}`,
      `Email: ${values.email}`,
      values.whatsapp ? `WhatsApp: ${values.whatsapp}` : '',
      '',
      values.message ?? '',
    ]
      .filter(Boolean)
      .join('\n')
    // eslint-disable-next-line no-console
    console.info('[Skylark RFQ]', values)
    try {
      window.open(
        `mailto:exports@skylarkexim.com?subject=${encodeURIComponent(
          `RFQ — ${values.products.join(' / ')} — ${values.company}`,
        )}&body=${encodeURIComponent(body)}`,
        '_self',
      )
    } catch {
      /* mail client unavailable; the payload is still captured above */
    }
    setSent(true)
  }

  return (
    <div className="rfq-layer" ref={wrap} style={{ opacity: 0, visibility: 'hidden' }}>
      <section className="rfq" id="rfq" aria-label="Request an export quote">
        {sent ? (
          <div className="rfq-sent">
            <div className="tick-circle">
              <Check size={26} strokeWidth={1.6} />
            </div>
            <h3>Enquiry captured</h3>
            <p>
              Your specification is ready to send. Our export desk replies with product
              availability, size grades, packing detail and the document set that travels with the
              carton.
            </p>
          </div>
        ) : (
          <>
            <header>
              <div className="kicker">22 · Request export quote</div>
              <h2>Name the product. We will answer with the specification.</h2>
              <p>
                Tell us the species, form, grade and destination. Every quote is returned with the
                document set that travels with the carton, including residue certification tested
                against EU and US limits, whichever is stricter.
              </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid">
                <div className="field full">
                  <label>Product interest</label>
                  <Controller
                    control={control}
                    name="products"
                    render={({ field }) => (
                      <div className="chips">
                        {PRODUCTS.map((p) => {
                          const on = field.value.includes(p)
                          return (
                            <label key={p} className="chip" data-on={on}>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() =>
                                  field.onChange(
                                    on ? field.value.filter((x) => x !== p) : [...field.value, p],
                                  )
                                }
                              />
                              {p}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  />
                  {errors.products && <span className="err">{errors.products.message}</span>}
                </div>

                {needsForms && (
                  <div className="field full">
                    <label>Shrimp form</label>
                    <Controller
                      control={control}
                      name="shrimpForms"
                      render={({ field }) => (
                        <div className="chips">
                          {FORMS.map((f) => {
                            const on = field.value.includes(f)
                            return (
                              <label key={f} className="chip" data-on={on}>
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() =>
                                    field.onChange(
                                      on ? field.value.filter((x) => x !== f) : [...field.value, f],
                                    )
                                  }
                                />
                                {f}
                              </label>
                            )
                          })}
                        </div>
                      )}
                    />
                    {errors.shrimpForms && <span className="err">{errors.shrimpForms.message}</span>}
                  </div>
                )}

                <div className="field">
                  <label htmlFor="grade">Size grade</label>
                  <select id="grade" {...register('grade')}>
                    <option value="">Select a grade</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  {errors.grade && <span className="err">{errors.grade.message}</span>}
                </div>

                <div className="field">
                  <label htmlFor="market">Destination market</label>
                  <input id="market" placeholder="Rotterdam, Osaka, Dubai…" {...register('market')} />
                  {errors.market && <span className="err">{errors.market.message}</span>}
                </div>

                <div className="field">
                  <label htmlFor="quantity">Indicative quantity</label>
                  <input id="quantity" placeholder="e.g. 2 x 40 ft reefer per month" {...register('quantity')} />
                  {errors.quantity && <span className="err">{errors.quantity.message}</span>}
                </div>

                <div className="field">
                  <label htmlFor="packaging">Packaging preference</label>
                  <select id="packaging" {...register('packaging')}>
                    <option value="">Select packaging</option>
                    {PACKAGING.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  {errors.packaging && <span className="err">{errors.packaging.message}</span>}
                </div>

                <div className="field full">
                  <label>Required documents</label>
                  <Controller
                    control={control}
                    name="documents"
                    render={({ field }) => (
                      <div className="chips">
                        {DOCS.map((d) => {
                          const on = field.value.includes(d)
                          return (
                            <label key={d} className="chip" data-on={on}>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() =>
                                  field.onChange(
                                    on ? field.value.filter((x) => x !== d) : [...field.value, d],
                                  )
                                }
                              />
                              {d}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  />
                  {errors.documents && <span className="err">{errors.documents.message}</span>}
                </div>

                <div className="field">
                  <label htmlFor="name">Your name</label>
                  <input id="name" autoComplete="name" {...register('name')} />
                  {errors.name && <span className="err">{errors.name.message}</span>}
                </div>

                <div className="field">
                  <label htmlFor="company">Company</label>
                  <input id="company" autoComplete="organization" {...register('company')} />
                  {errors.company && <span className="err">{errors.company.message}</span>}
                </div>

                <div className="field">
                  <label htmlFor="email">Business email</label>
                  <input id="email" type="email" autoComplete="email" {...register('email')} />
                  {errors.email && <span className="err">{errors.email.message}</span>}
                </div>

                <div className="field">
                  <label htmlFor="whatsapp">WhatsApp (optional)</label>
                  <input id="whatsapp" inputMode="tel" placeholder="+" {...register('whatsapp')} />
                </div>

                <div className="field full">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    placeholder="Delivery window, label requirements, buyer specification…"
                    {...register('message')}
                  />
                </div>
              </div>

              <div className="rfq-actions">
                <div className="note">
                  Every batch is tested before shipment against EU and US residue limits, whichever
                  is stricter. The certificate travels with the carton.
                </div>
                <button className="submit" type="submit" disabled={isSubmitting}>
                  <Send size={14} strokeWidth={1.8} />
                  Request export quote
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
