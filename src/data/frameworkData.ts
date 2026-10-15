// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModuleTag {
  label: string
  color: 'blue' | 'green' | 'pink' | 'amber' | 'purple' | 'teal' | 'gray' | 'red'
}

export interface Disclosure {
  code: string
  title: string
  description: string
  notes: string
  modules: ModuleTag[]
}

export interface DisclosureGroup {
  name: string
  theme: 'gov' | 'str' | 'risk' | 'met' | 'em' | 'tgt' | 'trn'
  disclosures: Disclosure[]
}

export interface Framework {
  id: string
  name: string
  shortName: string
  description: string
  disclosureCount: number
  badge: { label: string; bg: string; text: string }
  groups: DisclosureGroup[]
}

export interface InteropRow {
  dataPoint: string
  gri: string
  tcfd: string
  csrd: string
  issb: string
}

// ─── Theme & Tag Colour Maps ──────────────────────────────────────────────────

export const GROUP_THEME_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  gov:  { bg: '#EEEDFE', text: '#3C3489', border: '#CECBF6' },
  str:  { bg: '#E6F1FB', text: '#0C447C', border: '#B5D4F4' },
  risk: { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775' },
  met:  { bg: '#E1F5EE', text: '#085041', border: '#9FE1CB' },
  em:   { bg: '#FAECE7', text: '#993C1D', border: '#F4C0C1' },
  tgt:  { bg: '#F1EFE8', text: '#444441', border: '#D3D1C7' },
  trn:  { bg: '#FBEAF0', text: '#72243E', border: '#F4C0D1' },
}

export const MODULE_TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: '#E6F1FB', text: '#0C447C', border: '#B5D4F4' },
  green:  { bg: '#E1F5EE', text: '#085041', border: '#9FE1CB' },
  pink:   { bg: '#FBEAF0', text: '#72243E', border: '#F4C0D1' },
  amber:  { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775' },
  purple: { bg: '#EEEDFE', text: '#3C3489', border: '#CECBF6' },
  teal:   { bg: '#E1F5EE', text: '#085041', border: '#9FE1CB' },
  gray:   { bg: '#F1EFE8', text: '#444441', border: '#D3D1C7' },
  red:    { bg: '#FCEBEB', text: '#791F1F', border: '#F7C1C1' },
}

// ─── Framework Data ───────────────────────────────────────────────────────────

export const FRAMEWORKS: Framework[] = [
  // ── 1. GRI 305: Emissions ─────────────────────────────────────────────────
  {
    id: 'gri-305',
    name: 'GRI 305: Emissions',
    shortName: 'GRI 305',
    description:
      '7 mandatory disclosures covering Scope 1/2/3 GHG emissions, intensity, reductions, ODS, and air pollutants.',
    disclosureCount: 7,
    badge: { label: 'GRI', bg: '#0F7B8A', text: '#fff' },
    groups: [
      {
        name: 'Emissions disclosures',
        theme: 'em',
        disclosures: [
          {
            code: '305-1',
            title: 'Direct (Scope 1) GHG emissions',
            description:
              'Gross Scope 1 in metric tonnes CO₂e. Gases included. Biogenic CO₂ separately. Base year + rationale. Source of EFs and GWP.',
            notes: 'Mandatory. Exclude GHG trades. Use IPCC 100-yr GWP.',
            modules: [
              { label: 'Stationary', color: 'blue' },
              { label: 'Transport', color: 'green' },
              { label: 'HFC/PFC', color: 'pink' },
            ],
          },
          {
            code: '305-2',
            title: 'Energy indirect (Scope 2) GHG emissions',
            description:
              'Gross location-based + market-based Scope 2 in CO₂e. Purchased electricity, heat, steam, cooling.',
            notes: 'Both location + market-based required.',
            modules: [
              { label: 'Electricity', color: 'purple' },
              { label: 'Heat/Steam', color: 'purple' },
              { label: 'CHP', color: 'amber' },
            ],
          },
          {
            code: '305-3',
            title: 'Other indirect (Scope 3) GHG emissions',
            description: 'Gross Scope 3 by 15 GHG Protocol categories.',
            notes: 'Breakdown by GHG Protocol categories. Biogenic CO₂ separate.',
            modules: [
              { label: 'Transport S3', color: 'green' },
              { label: 'Spend-based', color: 'purple' },
              { label: 'Waste', color: 'purple' },
              { label: 'Travel', color: 'purple' },
            ],
          },
          {
            code: '305-4',
            title: 'GHG emissions intensity',
            description: 'Intensity ratio per revenue, FTE, or units.',
            notes: 'Denominator: revenue, FTE, units, m².',
            modules: [{ label: 'Aggregator', color: 'teal' }],
          },
          {
            code: '305-5',
            title: 'Reduction of GHG emissions',
            description:
              'Reductions achieved vs base year. Whether offsets used.',
            notes: 'Reductions vs base year. Offsets reported separately.',
            modules: [{ label: 'Aggregator', color: 'teal' }],
          },
          {
            code: '305-6',
            title: 'Emissions of ozone-depleting substances (ODS)',
            description:
              'Production, imports, exports in CFC-11 equivalent.',
            notes: 'Montreal Protocol substances.',
            modules: [
              { label: 'HFC/PFC', color: 'pink' },
              { label: 'GWP ref', color: 'gray' },
            ],
          },
          {
            code: '305-7',
            title: 'NOx, SOx, and other significant air emissions',
            description: 'NOx, SOx, POP, VOC, HAP, PM.',
            notes: 'Air quality pollutants, separate measurement.',
            modules: [{ label: 'Direct measurement', color: 'gray' }],
          },
        ],
      },
    ],
  },

  // ── 2. GRI 102: Climate change ────────────────────────────────────────────
  {
    id: 'gri-102',
    name: 'GRI 102: Climate change',
    shortName: 'GRI 102',
    description:
      'New comprehensive climate standard replacing GRI 305-1 to 305-5. Adds governance, just transition, targets, carbon credits. Aligned with Paris 1.5°C.',
    disclosureCount: 7,
    badge: { label: 'GRI', bg: '#0F7B8A', text: '#fff' },
    groups: [
      {
        name: 'Governance & strategy',
        theme: 'gov',
        disclosures: [
          {
            code: 'CC-1',
            title: 'Governance',
            description:
              'Board oversight of climate impacts. Management\'s role.',
            notes: 'Aligned with TCFD Governance.',
            modules: [{ label: 'Narrative', color: 'gray' }],
          },
          {
            code: 'CC-2',
            title: 'Strategy',
            description:
              'Climate risks/opportunities. Transition plan aligned with 1.5°C. Scenario analysis.',
            notes: 'Aligned with TCFD Strategy + ISSB S2.',
            modules: [
              { label: 'Narrative', color: 'gray' },
              { label: 'Analytics', color: 'teal' },
            ],
          },
          {
            code: 'CC-3',
            title: 'Just transition',
            description:
              'Workers, communities, vulnerable groups. Jobs created/eliminated/redeployed.',
            notes: 'New disclosure — social dimension of climate action.',
            modules: [{ label: 'Narrative', color: 'gray' }],
          },
        ],
      },
      {
        name: 'Emissions',
        theme: 'em',
        disclosures: [
          {
            code: 'CC-4',
            title: 'GHG emission reduction targets',
            description:
              'Absolute and intensity targets. Base year. Whether science-based. Progress.',
            notes: 'Must relate to Paris 1.5°C pathway.',
            modules: [
              { label: 'Aggregator', color: 'teal' },
              { label: 'Analytics', color: 'teal' },
            ],
          },
          {
            code: 'CC-5',
            title: 'Scope 1, 2, 3 GHG emissions',
            description:
              'Replaces 305-1/2/3. Both location + market Scope 2. Scope 3 by 15 categories. All gases disaggregated.',
            notes: 'Enhanced from 305. Full gas disaggregation mandatory.',
            modules: [
              { label: 'Stationary', color: 'blue' },
              { label: 'Transport', color: 'green' },
              { label: 'HFC/PFC', color: 'pink' },
              { label: 'CHP', color: 'amber' },
              { label: 'All calcs', color: 'purple' },
              { label: 'Aggregator', color: 'teal' },
            ],
          },
        ],
      },
      {
        name: 'Carbon credits & removals',
        theme: 'tgt',
        disclosures: [
          {
            code: 'CC-6',
            title: 'Carbon credits',
            description:
              'Type and amount purchased/retired. Certification scheme.',
            notes: 'New disclosure. Credits NOT subtracted from gross emissions.',
            modules: [
              { label: 'Narrative', color: 'gray' },
              { label: 'Publish', color: 'gray' },
            ],
          },
          {
            code: 'CC-7',
            title: 'GHG removals',
            description:
              'CO₂ removed via owned activities. Nature-based or technological.',
            notes: 'New disclosure. Separate from emission reductions.',
            modules: [
              { label: 'Narrative', color: 'gray' },
              { label: 'Publish', color: 'gray' },
            ],
          },
        ],
      },
    ],
  },

  // ── 3. TCFD ───────────────────────────────────────────────────────────────
  {
    id: 'tcfd',
    name: 'TCFD',
    shortName: 'TCFD',
    description:
      'Four pillars: Governance, Strategy, Risk Management, Metrics & Targets. 11 recommended disclosures. Now integrated into ISSB/IFRS S2.',
    disclosureCount: 11,
    badge: { label: 'TCFD', bg: '#1E3A5F', text: '#fff' },
    groups: [
      {
        name: 'Governance',
        theme: 'gov',
        disclosures: [
          {
            code: 'GOV-a',
            title:
              'Board oversight of climate-related risks and opportunities',
            description:
              'Board oversight of climate-related risks and opportunities.',
            notes: 'Narrative template.',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
          {
            code: 'GOV-b',
            title:
              'Management\'s role in assessing and managing climate risks',
            description:
              'Management\'s role in assessing and managing climate risks.',
            notes: 'Narrative template.',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
        ],
      },
      {
        name: 'Strategy',
        theme: 'str',
        disclosures: [
          {
            code: 'STR-a',
            title:
              'Climate-related risks and opportunities (short/medium/long term)',
            description:
              'Physical + transition risks.',
            notes: 'Narrative + scenario analysis.',
            modules: [
              { label: 'Publish', color: 'gray' },
              { label: 'Analytics', color: 'teal' },
            ],
          },
          {
            code: 'STR-b',
            title: 'Impact on business, strategy, and financial planning',
            description:
              'Impact on business, strategy, and financial planning.',
            notes: 'Financial quantification where possible.',
            modules: [
              { label: 'Analytics', color: 'teal' },
              { label: 'Publish', color: 'gray' },
            ],
          },
          {
            code: 'STR-c',
            title:
              'Resilience of strategy under climate scenarios including 2°C',
            description:
              'Resilience of strategy under climate scenarios including 2°C.',
            notes: 'Scenario analysis (2°C, 1.5°C, BAU).',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
        ],
      },
      {
        name: 'Risk management',
        theme: 'risk',
        disclosures: [
          {
            code: 'RM-a',
            title:
              'Processes for identifying and assessing climate risks',
            description:
              'Processes for identifying and assessing climate risks.',
            notes: 'Process description.',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
          {
            code: 'RM-b',
            title: 'Processes for managing climate risks',
            description: 'Processes for managing climate risks.',
            notes: 'Process description.',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
          {
            code: 'RM-c',
            title: 'Integration into overall risk management',
            description: 'Integration into overall risk management.',
            notes: 'Integration description.',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
        ],
      },
      {
        name: 'Metrics & targets',
        theme: 'met',
        disclosures: [
          {
            code: 'MT-a',
            title:
              'Metrics used to assess climate risks/opportunities',
            description:
              'Internal carbon price.',
            notes: 'Quantitative — from calculators.',
            modules: [
              { label: 'Aggregator', color: 'teal' },
              { label: 'Analytics', color: 'teal' },
            ],
          },
          {
            code: 'MT-b',
            title: 'Scope 1, 2, 3 GHG emissions',
            description: 'GHG Protocol methodology.',
            notes: 'Core quantitative output.',
            modules: [
              { label: 'Stationary', color: 'blue' },
              { label: 'Transport', color: 'green' },
              { label: 'HFC/PFC', color: 'pink' },
              { label: 'CHP', color: 'amber' },
              { label: 'Aggregator', color: 'teal' },
            ],
          },
          {
            code: 'MT-c',
            title: 'Targets for climate risk management',
            description: 'Performance against targets.',
            notes: 'Targets + progress tracking.',
            modules: [
              { label: 'Aggregator', color: 'teal' },
              { label: 'Analytics', color: 'teal' },
            ],
          },
        ],
      },
    ],
  },

  // ── 4. CSRD / ESRS E1 ────────────────────────────────────────────────────
  {
    id: 'csrd-e1',
    name: 'CSRD / ESRS E1',
    shortName: 'CSRD E1',
    description:
      'EU mandatory disclosure under CSRD. 9 disclosure requirements covering transition plan, energy, emissions, carbon credits, carbon pricing, and financial effects.',
    disclosureCount: 9,
    badge: { label: 'CSRD', bg: '#D4A017', text: '#000' },
    groups: [
      {
        name: 'Transition plan & targets',
        theme: 'str',
        disclosures: [
          {
            code: 'E1-1',
            title: 'Transition plan for climate change mitigation',
            description:
              'Paris 1.5°C, EU climate neutrality 2050.',
            notes: 'Mandatory for all in-scope.',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
          {
            code: 'E1-2',
            title:
              'Policies related to climate change mitigation and adaptation',
            description:
              'Policies related to climate change mitigation and adaptation.',
            notes: 'Narrative.',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
          {
            code: 'E1-3',
            title: 'Actions and resources',
            description:
              'Key actions, decarbonisation levers, CapEx/OpEx.',
            notes: 'Quantitative + narrative.',
            modules: [
              { label: 'Publish', color: 'gray' },
              { label: 'Analytics', color: 'teal' },
            ],
          },
          {
            code: 'E1-4',
            title: 'Targets related to climate change',
            description:
              'Absolute and intensity. SBTi validated.',
            notes: 'Science-based preferred.',
            modules: [
              { label: 'Aggregator', color: 'teal' },
              { label: 'Analytics', color: 'teal' },
            ],
          },
        ],
      },
      {
        name: 'Energy & emissions',
        theme: 'em',
        disclosures: [
          {
            code: 'E1-5',
            title: 'Energy consumption and mix',
            description:
              'Total MWh, fossil/nuclear/renewable split, intensity.',
            notes: 'Quantitative. Feeds from energy data.',
            modules: [
              { label: 'Stationary', color: 'blue' },
              { label: 'Electricity', color: 'purple' },
            ],
          },
          {
            code: 'E1-6',
            title: 'Gross Scope 1, 2, 3 and total GHG emissions',
            description:
              'Location + market-based. Scope 3 by category. GHG intensity per net revenue.',
            notes: 'Core quantitative. GHG Protocol. All gases.',
            modules: [
              { label: 'Stationary', color: 'blue' },
              { label: 'Transport', color: 'green' },
              { label: 'HFC/PFC', color: 'pink' },
              { label: 'CHP', color: 'amber' },
              { label: 'All calcs', color: 'purple' },
              { label: 'Aggregator', color: 'teal' },
            ],
          },
          {
            code: 'E1-7',
            title: 'GHG removals and carbon credits',
            description: 'Not netted from gross emissions.',
            notes: 'Credits separate per CSRD.',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
        ],
      },
      {
        name: 'Carbon pricing & financial effects',
        theme: 'risk',
        disclosures: [
          {
            code: 'E1-8',
            title: 'Internal carbon pricing',
            description:
              'Shadow price, fee, cap-and-trade. Price per tonne.',
            notes: 'Quantitative if applicable.',
            modules: [
              { label: 'Analytics', color: 'teal' },
              { label: 'Publish', color: 'gray' },
            ],
          },
          {
            code: 'E1-9',
            title: 'Anticipated financial effects',
            description:
              'Assets at risk. % revenue affected. Stranded assets.',
            notes: 'Forward-looking. Scenario-based.',
            modules: [
              { label: 'Publish', color: 'gray' },
              { label: 'Analytics', color: 'teal' },
            ],
          },
        ],
      },
    ],
  },

  // ── 5. ISSB / IFRS S2 ────────────────────────────────────────────────────
  {
    id: 'issb-s2',
    name: 'ISSB / IFRS S2',
    shortName: 'ISSB S2',
    description:
      'Global baseline standard. Fully incorporates TCFD. Requires Scope 1/2/3 via GHG Protocol. Industry-specific metrics via SASB. High interoperability with GRI.',
    disclosureCount: 9,
    badge: { label: 'ISSB', bg: '#534AB7', text: '#fff' },
    groups: [
      {
        name: 'Governance',
        theme: 'gov',
        disclosures: [
          {
            code: 'S2.5-7',
            title:
              'Governance of climate-related risks/opportunities',
            description: 'Board oversight, management role.',
            notes: 'Maps to TCFD GOV-a/b.',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
        ],
      },
      {
        name: 'Strategy',
        theme: 'str',
        disclosures: [
          {
            code: 'S2.8-22',
            title: 'Climate-related risks/opportunities',
            description:
              'Physical + transition risks. Financial effects. Transition plan. Scenario resilience (1.5°C).',
            notes: 'More granular than TCFD.',
            modules: [
              { label: 'Publish', color: 'gray' },
              { label: 'Analytics', color: 'teal' },
            ],
          },
        ],
      },
      {
        name: 'Risk management',
        theme: 'risk',
        disclosures: [
          {
            code: 'S2.23-24',
            title:
              'Processes for identifying, assessing, monitoring climate risks',
            description: 'Integration into overall risk management.',
            notes: 'Maps to TCFD RM-a/b/c.',
            modules: [{ label: 'Publish', color: 'gray' }],
          },
        ],
      },
      {
        name: 'Metrics & targets',
        theme: 'met',
        disclosures: [
          {
            code: 'S2.29(a)',
            title: 'Cross-industry GHG emissions',
            description:
              'Scope 1, 2 (location-based), 3. GHG Protocol mandatory.',
            notes: 'Core output.',
            modules: [
              { label: 'Stationary', color: 'blue' },
              { label: 'Transport', color: 'green' },
              { label: 'HFC/PFC', color: 'pink' },
              { label: 'CHP', color: 'amber' },
              { label: 'Aggregator', color: 'teal' },
            ],
          },
          {
            code: 'S2.29(b)',
            title: 'Scope 2 market-based',
            description: 'Contractual instruments.',
            notes: 'If RECs/PPAs used.',
            modules: [
              { label: 'Electricity', color: 'purple' },
              { label: 'Aggregator', color: 'teal' },
            ],
          },
          {
            code: 'S2.29(c)',
            title: 'Scope 3 categories included',
            description: 'Scope 3 categories included.',
            notes: 'Transition relief: yr 1 may omit.',
            modules: [
              { label: 'Transport S3', color: 'green' },
              { label: 'All S3 calcs', color: 'purple' },
            ],
          },
          {
            code: 'S2.29(d-g)',
            title: 'Additional metrics',
            description:
              'Internal carbon price, remuneration, vulnerable assets, SASB metrics.',
            notes: 'May require supplementary data.',
            modules: [
              { label: 'Analytics', color: 'teal' },
              { label: 'Publish', color: 'gray' },
            ],
          },
          {
            code: 'S2.33-37',
            title: 'Climate-related targets',
            description:
              'Science-based, base year, interim milestones, performance.',
            notes: 'Target tracking + progress.',
            modules: [
              { label: 'Aggregator', color: 'teal' },
              { label: 'Analytics', color: 'teal' },
            ],
          },
        ],
      },
    ],
  },
]

// ─── Cross-Framework Interoperability Map ─────────────────────────────────────

export const INTEROP_MAP: InteropRow[] = [
  {
    dataPoint: 'Scope 1 gross',
    gri: '305-1 / CC-5',
    tcfd: 'MT-b',
    csrd: 'E1-6',
    issb: 'S2.29(a)',
  },
  {
    dataPoint: 'Scope 2 location',
    gri: '305-2 / CC-5',
    tcfd: 'MT-b',
    csrd: 'E1-6',
    issb: 'S2.29(a)',
  },
  {
    dataPoint: 'Scope 2 market',
    gri: '305-2 / CC-5',
    tcfd: 'MT-b',
    csrd: 'E1-6',
    issb: 'S2.29(b)',
  },
  {
    dataPoint: 'Scope 3 total',
    gri: '305-3 / CC-5',
    tcfd: 'MT-b',
    csrd: 'E1-6',
    issb: 'S2.29(c)',
  },
  {
    dataPoint: 'Biogenic CO₂',
    gri: '305-1/3 mandatory',
    tcfd: 'Not required',
    csrd: 'E1-6',
    issb: 'S2 not req.',
  },
  {
    dataPoint: 'Gas breakdown',
    gri: '305-1/2/3 mandatory',
    tcfd: 'Not required',
    csrd: 'E1-6',
    issb: 'S2 if material',
  },
  {
    dataPoint: 'GHG intensity',
    gri: '305-4 / CC-5',
    tcfd: 'MT-a',
    csrd: 'E1-6',
    issb: 'S2.29',
  },
  {
    dataPoint: 'GHG reduction',
    gri: '305-5 / CC-4',
    tcfd: 'MT-c',
    csrd: 'E1-4',
    issb: 'S2.33-37',
  },
  {
    dataPoint: 'Targets',
    gri: 'CC-4',
    tcfd: 'MT-c',
    csrd: 'E1-4',
    issb: 'S2.33-37',
  },
  {
    dataPoint: 'Carbon credits',
    gri: 'CC-6',
    tcfd: '—',
    csrd: 'E1-7',
    issb: '—',
  },
  {
    dataPoint: 'GHG removals',
    gri: 'CC-7',
    tcfd: '—',
    csrd: 'E1-7',
    issb: '—',
  },
  {
    dataPoint: 'Governance',
    gri: 'CC-1',
    tcfd: 'GOV-a/b',
    csrd: 'ESRS 2',
    issb: 'S2.5-7',
  },
  {
    dataPoint: 'Strategy',
    gri: 'CC-2',
    tcfd: 'STR-a/b/c',
    csrd: 'E1-1',
    issb: 'S2.8-22',
  },
  {
    dataPoint: 'Risk mgmt',
    gri: '—',
    tcfd: 'RM-a/b/c',
    csrd: 'ESRS 2',
    issb: 'S2.23-24',
  },
  {
    dataPoint: 'Just transition',
    gri: 'CC-3',
    tcfd: '—',
    csrd: 'E1-1 (partial)',
    issb: '—',
  },
]
