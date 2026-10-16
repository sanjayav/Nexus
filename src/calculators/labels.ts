// Render-time localisation for calculator descriptors.
//
// The calculator modules (registry.ts, scope3/**) keep their English labels as
// the canonical source — those strings double as defaults here, so English
// output is unchanged. Translations live in
//   src/i18n/locales/<lng>/calculators.json  → `calculators.registry.<id>…`
//   src/i18n/locales/<lng>/scope3.json       → `scope3.calcs.<id>…`
// Only display text is localised. Ids, option values, units stored on records
// and compute()/matches() behaviour are passed through untouched.

import i18next from 'i18next'
import type { CalcDescriptor } from './registry'
import type { Scope3Calculator } from './scope3'

/** Minimal translate signature — accepts the `t` from `useTranslation()`. */
type TFn = (key: string, options?: Record<string, unknown>) => string

/**
 * Translate a free-text English string that has no stable id (footnotes,
 * result notes, unit words) by finding its key in the English dictionary at
 * `path`. Falls back to the original text when no entry matches.
 */
function byEnglish(t: TFn, path: string, english: string): string {
  const dict = i18next.getResource('en', 'translation', path) as Record<string, string> | undefined
  if (!dict || typeof dict !== 'object') return english
  for (const [k, v] of Object.entries(dict)) {
    if (v === english) return t(`${path}.${k}`, { defaultValue: english })
  }
  return english
}

/** "e.g. 48200" → "例如 48200"; other placeholders pass through. */
function localizePlaceholder(t: TFn, placeholder: string | undefined): string | undefined {
  if (!placeholder) return placeholder
  const m = /^e\.g\.\s+(.*)$/.exec(placeholder)
  if (!m) return placeholder
  return t('calculators.placeholderExample', { value: m[1], defaultValue: placeholder })
}

/** Localise a unit word ("Million tons", "hours", "years"). Codes like kWh / tCO2e pass through. */
export function localizeUnit(t: TFn, unit: string | undefined | null): string {
  if (!unit) return unit ?? ''
  return byEnglish(t, 'calculators.units', unit)
}

/** Localise a methodology footnote or a calculator result note. */
export function localizeCalcNote(t: TFn, note: string | undefined | null): string {
  if (!note) return note ?? ''
  const fromFootnotes = byEnglish(t, 'calculators.footnotes', note)
  if (fromFootnotes !== note) return fromFootnotes
  return byEnglish(t, 'scope3.notes', note)
}

/**
 * Return a copy of a GRI calculator descriptor with display text localised
 * (title, description, input labels/hints/placeholders, option labels/notes,
 * footnotes). `id`, `inputs[].key`, `inputs[].unit`, option `value`/`factor`,
 * `compute` and `matches` are unchanged. Pass-through for null.
 *
 *   const { t } = useTranslation()
 *   const calc = localizeCalc(t, findCalculator(item))
 */
export function localizeCalc(t: TFn, d: CalcDescriptor): CalcDescriptor
export function localizeCalc(t: TFn, d: CalcDescriptor | null): CalcDescriptor | null
export function localizeCalc(t: TFn, d: CalcDescriptor | null): CalcDescriptor | null {
  if (!d) return d
  const base = `calculators.registry.${d.id}`
  return {
    ...d,
    title: t(`${base}.title`, { defaultValue: d.title }),
    description: t(`${base}.description`, { defaultValue: d.description }),
    inputs: d.inputs.map(inp => {
      const ib = `${base}.inputs.${inp.key}`
      return {
        ...inp,
        label: t(`${ib}.label`, { defaultValue: inp.label }),
        hint: inp.hint ? t(`${ib}.hint`, { defaultValue: inp.hint }) : inp.hint,
        placeholder: localizePlaceholder(t, inp.placeholder),
        options: inp.options?.map(o => ({
          ...o,
          label: t(`${ib}.options.${o.value}.label`, { defaultValue: o.label }),
          note: o.note ? t(`${ib}.options.${o.value}.note`, { defaultValue: o.note }) : o.note,
        })),
      }
    }),
    footnotes: d.footnotes?.map(f => localizeCalcNote(t, f)),
  }
}

/**
 * Return a copy of a Scope 3 calculator with display text localised (name,
 * shortName, description, method names/notes, input labels/hints). Ids, keys,
 * `unit` (persisted as activity_unit), `options` values and `compute` are unchanged —
 * use `scope3OptionLabel` / `localizeUnit` to render those.
 */
export function localizeScope3(t: TFn, c: Scope3Calculator): Scope3Calculator {
  const base = `scope3.calcs.${c.id}`
  return {
    ...c,
    name: t(`${base}.name`, { defaultValue: c.name }),
    shortName: t(`${base}.shortName`, { defaultValue: c.shortName }),
    description: t(`${base}.description`, { defaultValue: c.description }),
    methods: c.methods.map(m => {
      const mb = `${base}.methods.${m.id}`
      return {
        ...m,
        name: t(`${mb}.name`, { defaultValue: m.name }),
        notes: m.notes ? localizeCalcNote(t, m.notes) : m.notes,
        inputs: m.inputs.map(inp => ({
          ...inp,
          label: t(`${mb}.inputs.${inp.key}.label`, { defaultValue: inp.label }),
          hint: inp.hint ? t(`${mb}.inputs.${inp.key}.hint`, { defaultValue: inp.hint }) : inp.hint,
        })),
      }
    }),
  }
}

/** Display label for a Scope 3 select option value (e.g. "flight_short_haul"). */
export function scope3OptionLabel(t: TFn, value: string): string {
  return t(`scope3.options.${value}`, { defaultValue: value })
}
