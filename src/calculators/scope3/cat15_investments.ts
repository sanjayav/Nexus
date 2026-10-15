import { Scope3Calculator, toNum, ILLUSTRATIVE_NOTE } from './index'

export const cat15: Scope3Calculator = {
  id: 'scope3_cat15',
  category: 15,
  name: 'Investments',
  shortName: 'Cat 15 Investments',
  description: 'Operation of investments (incl. equity, debt, project finance) — financed emissions per PCAF.',
  methods: [
    {
      id: 'equity_share',
      name: 'Equity-share attribution',
      priority: 1,
      inputs: [
        { key: 'investee_scope1_2', label: 'Investee Scope 1+2', unit: 'tCO2e', type: 'number', required: true },
        { key: 'equity_share_pct', label: 'Equity share', unit: '%', type: 'number', required: true, default: 100 },
      ],
      compute: (inputs) => ({
        co2e_tonnes: toNum(inputs.investee_scope1_2) * (toNum(inputs.equity_share_pct, 100) / 100),
        breakdown: { equity_share_pct: toNum(inputs.equity_share_pct, 100) },
        notes: 'PCAF Equity Share approach — capital × emissions ÷ EVIC.',
      }),
    },
    {
      id: 'project_finance',
      name: 'Project finance attribution',
      priority: 2,
      inputs: [
        { key: 'project_emissions', label: 'Project annual emissions', unit: 'tCO2e', type: 'number', required: true },
        { key: 'outstanding_amount', label: 'Outstanding investment', unit: 'USD', type: 'number', required: true },
        { key: 'project_total_value', label: 'Project total value (EVIC equiv.)', unit: 'USD', type: 'number', required: true },
      ],
      compute: (inputs) => {
        const totalValue = toNum(inputs.project_total_value)
        const share = totalValue > 0 ? toNum(inputs.outstanding_amount) / totalValue : 0
        return {
          co2e_tonnes: toNum(inputs.project_emissions) * share,
          breakdown: { attribution_share: share },
          notes: 'PCAF project-finance attribution.',
        }
      },
    },
    {
      id: 'economic_intensity',
      name: 'Economic intensity (spend × sector EF)',
      priority: 3,
      inputs: [
        { key: 'outstanding_amount', label: 'Outstanding investment', unit: 'USD', type: 'number', required: true },
        { key: 'sector_ef', label: 'Sector EF', unit: 'kgCO2e/USD invested', type: 'number', required: true, default: 0.3 },
      ],
      compute: (inputs) => ({
        co2e_tonnes: (toNum(inputs.outstanding_amount) * toNum(inputs.sector_ef, 0.3)) / 1000,
        notes: ILLUSTRATIVE_NOTE,
      }),
    },
  ],
}
