import { createElement, type SVGProps } from 'react'

/**
 * Hand-coded line illustrations for empty states. Each is a ~160×160 SVG
 * built entirely from `currentColor`, so the caller decides the tint —
 * wrap in `text-emerald-400/70` (or any text-* utility) to colour them.
 *
 * Tone: stylish line-drawn, asymmetric, with a single small visual quirk
 * each (a tick, a dot, a sparkline ping…). Aim is Big-4 brochure, not cute.
 */

type IllustrationProps = { className?: string }

function svg(children: SVGProps<SVGSVGElement>['children'], className: string) {
  return createElement(
    'svg',
    {
      viewBox: '0 0 160 160',
      className,
      fill: 'none',
      role: 'presentation',
      'aria-hidden': true,
    },
    children,
  )
}

const STROKE = { stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// ── EmptyTasksIllustration ────────────────────────────────────────────────
// A clipboard with three rows, a tick mark and a soft halo behind it.
export function EmptyTasksIllustration({ className = '' }: IllustrationProps) {
  return svg(
    [
      // Soft halo
      createElement('circle', { key: 'halo', cx: 80, cy: 80, r: 58, fill: 'currentColor', opacity: 0.05 }),
      // Clip tab at the top
      createElement('rect', { key: 'tab', x: 64, y: 22, width: 32, height: 12, rx: 3, ...STROKE, strokeWidth: 1.5, opacity: 0.7 }),
      // Clipboard body
      createElement('rect', { key: 'body', x: 42, y: 32, width: 76, height: 96, rx: 6, ...STROKE, strokeWidth: 1.5, opacity: 0.55 }),
      // Three list lines
      createElement('path', { key: 'l1', d: 'M58 60h44', ...STROKE, strokeWidth: 1.5, opacity: 0.35 }),
      createElement('path', { key: 'l2', d: 'M58 78h36', ...STROKE, strokeWidth: 1.5, opacity: 0.35 }),
      createElement('path', { key: 'l3', d: 'M58 96h28', ...STROKE, strokeWidth: 1.5, opacity: 0.35 }),
      // Big tick
      createElement('path', { key: 'tick', d: 'M58 112l8 8 18-22', ...STROKE, strokeWidth: 2, opacity: 0.9 }),
      // Sparkle dot
      createElement('circle', { key: 'dot', cx: 116, cy: 50, r: 2.5, fill: 'currentColor', opacity: 0.7 }),
    ],
    className,
  )
}

// ── EmptyInboxIllustration ────────────────────────────────────────────────
// An envelope, flap half-open, a quiet little dot above as if a message is
// just about to land.
export function EmptyInboxIllustration({ className = '' }: IllustrationProps) {
  return svg(
    [
      createElement('circle', { key: 'halo', cx: 80, cy: 86, r: 56, fill: 'currentColor', opacity: 0.05 }),
      // Envelope body
      createElement('rect', { key: 'env', x: 32, y: 60, width: 96, height: 64, rx: 6, ...STROKE, strokeWidth: 1.5, opacity: 0.6 }),
      // Flap (open V)
      createElement('path', { key: 'flap', d: 'M34 64l46 32 46-32', ...STROKE, strokeWidth: 1.5, opacity: 0.55 }),
      // Hint of a letter peeking out
      createElement('path', { key: 'paper', d: 'M58 82h44M58 92h28', ...STROKE, strokeWidth: 1.5, opacity: 0.3 }),
      // Incoming dot above the envelope
      createElement('circle', { key: 'dot', cx: 80, cy: 38, r: 3.5, fill: 'currentColor', opacity: 0.85 }),
      createElement('circle', { key: 'dotHalo', cx: 80, cy: 38, r: 8, ...STROKE, strokeWidth: 1, opacity: 0.35 }),
    ],
    className,
  )
}

// ── EmptyReportsIllustration ──────────────────────────────────────────────
// A document with chart lines and a folded corner; a small sparkline draws
// a rising trend on top of the page.
export function EmptyReportsIllustration({ className = '' }: IllustrationProps) {
  return svg(
    [
      createElement('circle', { key: 'halo', cx: 80, cy: 80, r: 58, fill: 'currentColor', opacity: 0.05 }),
      // Document — folded top-right corner
      createElement('path', {
        key: 'doc',
        d: 'M44 28h54l18 18v82a4 4 0 0 1-4 4H44a4 4 0 0 1-4-4V32a4 4 0 0 1 4-4z',
        ...STROKE,
        strokeWidth: 1.5,
        opacity: 0.55,
      }),
      createElement('path', { key: 'fold', d: 'M98 28v18h18', ...STROKE, strokeWidth: 1.5, opacity: 0.45 }),
      // Chart axes baseline
      createElement('path', { key: 'baseline', d: 'M54 110h52', ...STROKE, strokeWidth: 1.5, opacity: 0.35 }),
      // Bars
      createElement('rect', { key: 'b1', x: 58, y: 92, width: 8, height: 18, ...STROKE, strokeWidth: 1.5, opacity: 0.6 }),
      createElement('rect', { key: 'b2', x: 72, y: 82, width: 8, height: 28, ...STROKE, strokeWidth: 1.5, opacity: 0.7 }),
      createElement('rect', { key: 'b3', x: 86, y: 72, width: 8, height: 38, ...STROKE, strokeWidth: 1.5, opacity: 0.85 }),
      // Sparkline above
      createElement('path', { key: 'spark', d: 'M56 66l10-8 10 6 10-12 12 6', ...STROKE, strokeWidth: 1.5, opacity: 0.9 }),
      createElement('circle', { key: 'sparkdot', cx: 98, cy: 58, r: 2.5, fill: 'currentColor', opacity: 0.9 }),
    ],
    className,
  )
}

// ── EmptyEvidenceIllustration ─────────────────────────────────────────────
// A folder with a paperclip tucked in, plus a tag dangling off the corner.
export function EmptyEvidenceIllustration({ className = '' }: IllustrationProps) {
  return svg(
    [
      createElement('circle', { key: 'halo', cx: 80, cy: 84, r: 56, fill: 'currentColor', opacity: 0.05 }),
      // Folder tab
      createElement('path', {
        key: 'tab',
        d: 'M34 50h36l8 10h48a4 4 0 0 1 4 4v60a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4V54a4 4 0 0 1 4-4z',
        ...STROKE,
        strokeWidth: 1.5,
        opacity: 0.6,
      }),
      // Paper inside
      createElement('rect', { key: 'paper', x: 50, y: 70, width: 60, height: 44, rx: 3, ...STROKE, strokeWidth: 1.5, opacity: 0.45 }),
      // Paperclip
      createElement('path', {
        key: 'clip',
        d: 'M98 64v22a8 8 0 0 1-16 0V60a5 5 0 0 1 10 0v22a2 2 0 0 1-4 0V66',
        ...STROKE,
        strokeWidth: 1.5,
        opacity: 0.85,
      }),
      // Dangling tag
      createElement('path', { key: 'string', d: 'M128 122l6 8', ...STROKE, strokeWidth: 1.2, opacity: 0.6 }),
      createElement('path', { key: 'tag', d: 'M132 130l8 4-2 6-8-4z', ...STROKE, strokeWidth: 1.2, opacity: 0.7 }),
    ],
    className,
  )
}

// ── EmptyDataIllustration ─────────────────────────────────────────────────
// A small framed sparkline chart with two data dots and a rising trend.
export function EmptyDataIllustration({ className = '' }: IllustrationProps) {
  return svg(
    [
      createElement('circle', { key: 'halo', cx: 80, cy: 80, r: 56, fill: 'currentColor', opacity: 0.05 }),
      // Chart frame
      createElement('rect', { key: 'frame', x: 32, y: 40, width: 96, height: 80, rx: 6, ...STROKE, strokeWidth: 1.5, opacity: 0.5 }),
      // Y axis ticks
      createElement('path', { key: 'tick1', d: 'M40 60h-2M40 80h-2M40 100h-2', ...STROKE, strokeWidth: 1.2, opacity: 0.35 }),
      // X axis baseline
      createElement('path', { key: 'baseline', d: 'M44 108h72', ...STROKE, strokeWidth: 1.2, opacity: 0.3 }),
      // Sparkline
      createElement('path', { key: 'spark', d: 'M48 96l14-10 14 6 14-18 14 8 14-14', ...STROKE, strokeWidth: 1.75, opacity: 0.9 }),
      // Data points
      createElement('circle', { key: 'd1', cx: 76, cy: 92, r: 2.5, fill: 'currentColor', opacity: 0.8 }),
      createElement('circle', { key: 'd2', cx: 118, cy: 68, r: 3, fill: 'currentColor', opacity: 0.95 }),
      createElement('circle', { key: 'd2halo', cx: 118, cy: 68, r: 7, ...STROKE, strokeWidth: 1, opacity: 0.35 }),
    ],
    className,
  )
}
