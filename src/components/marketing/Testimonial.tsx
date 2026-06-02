import { Quote } from 'lucide-react'
import { FadeIn } from '../MotionPrimitives'

interface TestimonialProps {
  quote: string
  author: string
  /** Optional: badge text shown above the quote, e.g. "Customer story". */
  eyebrow?: string
}

/**
 * Single restrained pull-quote block. No avatars, no logos — the words do
 * the work. Placeholder authors are clearly marked as such.
 */
export default function Testimonial({ quote, author, eyebrow }: TestimonialProps) {
  return (
    <section className="py-20 sm:py-24">
      <div className="max-w-[920px] mx-auto px-5 sm:px-8">
        <FadeIn>
          <figure className="text-center">
            {eyebrow && (
              <p
                className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-5"
                style={{ color: 'var(--accent-600)' }}
              >
                {eyebrow}
              </p>
            )}
            <Quote
              className="w-8 h-8 mx-auto mb-6 opacity-40"
              style={{ color: 'var(--accent-600)' }}
              aria-hidden="true"
            />
            <blockquote
              className="text-[22px] sm:text-[26px] leading-snug font-medium tracking-tight"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              &ldquo;{quote}&rdquo;
            </blockquote>
            <figcaption
              className="mt-6 text-[13px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              — {author}
            </figcaption>
          </figure>
        </FadeIn>
      </div>
    </section>
  )
}
