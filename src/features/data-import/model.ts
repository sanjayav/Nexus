import { useMemo } from 'react'
import { useMockData } from '@/features/workspace/WorkspaceContext'
import { fieldLabelsZh, useQuestionnaireText } from '@/features/frameworks/content/questionnaireContent'
import { useSectionViews, type SectionView, type SeedSection } from '@/store/hooks'
import type { ImportSection, KnownKeys, ParsedSheet, TemplateSection } from '@/lib/spreadsheet'

type SeedField = SeedSection['fields'][number]

const unitsOf = (f: SeedField): string[] => ('units' in f && Array.isArray(f.units) ? f.units.map(String) : [])

/** Every label a field may appear under in a filled-in file: the source label and its Chinese translation. */
const labelsOf = (section: SeedSection, f: SeedField) =>
  [f.label, fieldLabelsZh[`${section.id}.${f.id}`] ?? fieldLabelsZh[f.id]].filter((l): l is string => !!l)

export const isLocked = (v: SectionView) => v.status === 'submitted' || v.status === 'approved'

/** Framework modules that have at least one questionnaire section, with their section / field counts. */
export function useImportableModules() {
  const seed = useMockData()
  return useMemo(
    () =>
      seed.modules
        .map(m => {
          const sections = seed.questionnaireSections.filter(s => s.module === m.id)
          return { id: m.id, title: m.title, sections: sections.length, fields: sections.reduce((n, s) => n + s.fields.length, 0) }
        })
        .filter(m => m.sections > 0),
    [seed],
  )
}

/** Field IDs, section IDs and labels across the whole workspace, for guessing columns of header-less pastes. */
export function useKnownKeys(): KnownKeys {
  const seed = useMockData()
  return useMemo(() => {
    const sectionIds: string[] = []
    const fieldIds: string[] = []
    const labels: string[] = []
    for (const s of seed.questionnaireSections) {
      sectionIds.push(s.id)
      for (const f of s.fields) {
        fieldIds.push(f.id)
        labels.push(...labelsOf(s, f))
      }
    }
    return { sectionIds, fieldIds, labels }
  }, [seed])
}

/** One module's sections in the shapes the spreadsheet helpers need, plus lookups for the review table. */
export function useModuleImportModel(moduleId: string) {
  const views = useSectionViews(moduleId)
  const qt = useQuestionnaireText()

  return useMemo(() => {
    const sections: ImportSection[] = views.map(v => ({
      id: v.section.id,
      locked: isLocked(v),
      values: v.values,
      fields: v.section.fields.map(f => ({ id: f.id, type: f.type, labels: labelsOf(v.section, f) })),
    }))
    const template: TemplateSection[] = views.map(v => ({
      id: v.section.id,
      title: qt.sectionTitle(v.section),
      fields: v.section.fields.map(f => {
        const unit = unitsOf(f)[0]
        return {
          id: f.id,
          label: qt.fieldLabel(v.section, f),
          required: f.required !== false,
          value: v.values[f.id] ?? '',
          unit: unit ? qt.unit(unit) : undefined,
        }
      }),
    }))
    const viewById = new Map(views.map(v => [v.section.id, v]))
    return { views, sections, template, viewById }
  }, [views, qt])
}

/** An uploaded file or paste, parsed into sheets. */
export interface ImportSource {
  name: string
  sheets: ParsedSheet[]
  sheetIndex: number
  pasted: boolean
}
