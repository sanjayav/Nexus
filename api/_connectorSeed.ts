import type { Sql } from './_db'

export interface ConnectorTemplateSeed {
  name: string
  source: 'sap_s4hana' | 'netsuite' | 'snowflake' | 'generic_csv'
  description: string
  scope: number | null
  category: string | null
  mapping: Record<string, string>
  required_columns: string[]
  optional_columns: string[]
  emission_factor_lookup: Record<string, unknown> | null
}

export const CONNECTOR_TEMPLATES: ConnectorTemplateSeed[] = [
  {
    name: 'SAP S/4HANA — Energy Consumption (CO088)',
    source: 'sap_s4hana',
    description: 'Cost center actuals export (CO088). Maps GJAHR/MONAT/KOSTL/MENGE/MEINS to monthly electricity consumption per facility.',
    scope: 2,
    category: 'Purchased electricity',
    mapping: {
      period_year: 'GJAHR',
      period_month: 'MONAT',
      facility_code: 'KOSTL',
      activity_value: 'MENGE',
      activity_unit: 'MEINS',
      notes: 'BLDAT',
    },
    required_columns: ['GJAHR', 'MONAT', 'KOSTL', 'MENGE', 'MEINS'],
    optional_columns: ['BLDAT'],
    emission_factor_lookup: { region: 'auto', scope: 2, category: 'Purchased electricity', fuel_or_activity: 'grid_average' },
  },
  {
    name: 'SAP S/4HANA — Fuel Procurement (MM Purchase Orders)',
    source: 'sap_s4hana',
    description: 'Materials management purchase orders for stationary combustion fuels. WERKS = plant, MATNR = material code.',
    scope: 1,
    category: 'Stationary combustion',
    mapping: {
      period_year: 'BUDAT_year',
      period_month: 'BUDAT_month',
      facility_code: 'WERKS',
      fuel_type: 'MATNR_desc',
      activity_value: 'MENGE',
      activity_unit: 'MEINS',
    },
    required_columns: ['BUDAT_year', 'BUDAT_month', 'WERKS', 'MATNR_desc', 'MENGE', 'MEINS'],
    optional_columns: [],
    emission_factor_lookup: { scope: 1, category: 'Stationary combustion', fuel_or_activity: 'fuel_type', region: 'GLOBAL' },
  },
  {
    name: 'NetSuite — Utility Bills',
    source: 'netsuite',
    description: 'NetSuite vendor bills tagged as utility. location_id resolves to facility.',
    scope: 2,
    category: 'Purchased electricity',
    mapping: {
      period_year: 'trandate_year',
      period_month: 'trandate_month',
      facility_code: 'location_id',
      activity_value: 'quantity',
      activity_unit: 'units',
      notes: 'memo',
    },
    required_columns: ['trandate_year', 'trandate_month', 'location_id', 'quantity', 'units'],
    optional_columns: ['memo'],
    emission_factor_lookup: { region: 'auto', scope: 2, category: 'Purchased electricity', fuel_or_activity: 'grid_average' },
  },
  {
    name: 'NetSuite — Travel & Expense',
    source: 'netsuite',
    description: 'T&E export, spend-based. Uses DEFRA travel spend factors per category.',
    scope: 3,
    category: 'Cat 6 - Business travel',
    mapping: {
      period_year: 'trandate_year',
      period_month: 'trandate_month',
      subcategory: 'expense_category',
      activity_value: 'amount',
      activity_unit: 'USD',
      notes: 'memo',
    },
    required_columns: ['trandate_year', 'trandate_month', 'expense_category', 'amount'],
    optional_columns: ['memo'],
    emission_factor_lookup: { scope: 3, category: 'Cat 6 - Business travel', fuel_or_activity: 'spend_based', region: 'GLOBAL' },
  },
  {
    name: 'Snowflake — Generic Activity Data',
    source: 'snowflake',
    description: 'Passthrough mapping from a Snowflake activity_data view. Scope/category defined per row.',
    scope: null,
    category: null,
    mapping: {
      period_year: 'period_year',
      period_month: 'period_month',
      facility_code: 'facility_code',
      scope: 'scope',
      category: 'category',
      fuel_type: 'fuel_type',
      activity_value: 'activity_value',
      activity_unit: 'activity_unit',
      emission_factor: 'emission_factor',
      ef_source: 'ef_source',
      co2e_tonnes: 'co2e_tonnes',
    },
    required_columns: ['period_year', 'period_month', 'facility_code', 'scope', 'activity_value'],
    optional_columns: ['category', 'fuel_type', 'activity_unit', 'emission_factor', 'ef_source', 'co2e_tonnes'],
    emission_factor_lookup: null,
  },
  {
    name: 'Generic CSV — Universal Mapping',
    source: 'generic_csv',
    description: 'Bring-your-own CSV. Caller supplies the mapping at upload time.',
    scope: null,
    category: null,
    mapping: {},
    required_columns: [],
    optional_columns: [],
    emission_factor_lookup: null,
  },
]

export async function seedConnectorTemplates(sql: Sql): Promise<void> {
  for (const t of CONNECTOR_TEMPLATES) {
    await sql`
      INSERT INTO connector_templates
        (name, source, description, scope, category, mapping, required_columns, optional_columns, emission_factor_lookup, is_system)
      VALUES
        (${t.name}, ${t.source}, ${t.description}, ${t.scope}, ${t.category},
         ${JSON.stringify(t.mapping)}::jsonb,
         ${JSON.stringify(t.required_columns)}::jsonb,
         ${JSON.stringify(t.optional_columns)}::jsonb,
         ${t.emission_factor_lookup ? JSON.stringify(t.emission_factor_lookup) : null}::jsonb,
         true)
      ON CONFLICT (source, name) DO NOTHING
    `
  }
}
