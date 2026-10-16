import { Link } from 'react-router-dom'
import { LucideIcon, ArrowRight } from 'lucide-react'
import { Illustration, type IllustrationName } from '../ui'
import { RevealGroup, RevealItem } from './motion'
import { SectionHeading } from './PageHero'

/**
 * FeatureGrid — feature blocks for the marketing pages, in two layouts:
 *
 *   variant="bento"  — the lead feature spans two rows with a contour
 *                      illustration; the rest stack beside it. For 3 pillars.
 *   variant="ledger" — no boxes: a hairline-ruled grid of icon, title, body.
 *                      For longer capability lists, so the page doesn't turn
 *                      into a wall of identical cards.
 */
export interface Feature {
  icon: LucideIcon
  title: string
  body: string
  link?: { label: string; href: string }
  illustration?: IllustrationName
}

interface FeatureGridProps {
  features: Feature[]
  /** Ledger columns at lg. */
  columns?: 2 | 3
  variant?: 'bento' | 'ledger'
  /** Kept for API compatibility; sections no longer carry eyebrows. */
  eyebrow?: string
  heading?: string
  subheading?: string
  id?: string
}

function FeatureLink({ link }: { link: NonNullable<Feature['link']> }) {
  const internal = link.href.startsWith('/')
  const cls = 'mt-5 inline-flex items-center gap-1.5 min-h-[40px] text-[14px] font-semibold group/link'
  const inner = (
    <>
      {link.label}
      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-0.5" aria-hidden />
    </>
  )
  return internal
    ? <Link to={link.href} className={cls} style={{ color: 'var(--text-link)' }}>{inner}</Link>
    : <a href={link.href} className={cls} style={{ color: 'var(--text-link)' }}>{inner}</a>
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      className="w-10 h-10 rounded-[10px] inline-flex items-center justify-center flex-shrink-0"
      style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand-strong)' }}
      aria-hidden
    >
      <Icon className="w-[18px] h-[18px]" />
    </span>
  )
}

export default function FeatureGrid({ features, columns = 3, variant = 'ledger', heading, subheading, id }: FeatureGridProps) {
  return (
    <section id={id} className="py-20 sm:py-28">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
        {heading && <SectionHeading title={heading} lead={subheading} className="mb-12 sm:mb-16" />}

        {variant === 'bento' ? (
          <RevealGroup className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[1.25fr_1fr] lg:grid-rows-2">
            {features.map((f, i) => {
              const lead = i === 0
              return (
                <RevealItem
                  as="article"
                  key={f.title}
                  className={`relative overflow-hidden rounded-[20px] p-7 sm:p-9 flex flex-col ${lead ? 'lg:row-span-2 surface-hero' : 'surface-paper'}`}
                >
                  {lead && f.illustration && (
                    <div className="mb-8 -ml-2">
                      <Illustration name={f.illustration} size={200} />
                    </div>
                  )}
                  {!lead && <IconTile icon={f.icon} />}
                  <h3 className={`${lead ? 'type-h1' : 'type-h2 mt-5'}`} style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
                    {f.title}
                  </h3>
                  <p className={`mt-3 ${lead ? 'text-[16px] leading-[1.65] max-w-[520px]' : 'type-body'}`} style={{ color: 'var(--text-secondary)' }}>
                    {f.body}
                  </p>
                  {f.link && <div className={lead ? 'mt-auto pt-2' : ''}><FeatureLink link={f.link} /></div>}
                </RevealItem>
              )
            })}
          </RevealGroup>
        ) : (
          <RevealGroup
            className={`grid grid-cols-1 sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''}`}
            as="div"
          >
            {features.map((f) => (
              <RevealItem
                as="article"
                key={f.title}
                className="py-7 sm:pr-8"
              >
                <div style={{ borderTop: '1px solid var(--border-default)' }} className="pt-7">
                  <IconTile icon={f.icon} />
                  <h3 className="mt-5 type-h3" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                  <p className="mt-2 type-body max-w-[420px]" style={{ color: 'var(--text-secondary)' }}>{f.body}</p>
                  {f.link && <FeatureLink link={f.link} />}
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  )
}
