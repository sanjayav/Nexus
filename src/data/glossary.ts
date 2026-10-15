/**
 * ESG / sustainability-reporting glossary. Keyed by the short code (the
 * acronym or framework identifier as users see it) and used by
 * `<JargonTooltip term="...">` to surface a plain-English definition on
 * hover/focus throughout the app.
 *
 * Add entries here rather than re-defining the same explanation across
 * pages — that's the whole point. Keep `definition` to one or two
 * sentences. If a term is framework-specific, set `framework` so the
 * tooltip can render a subtle tag.
 */
export interface GlossaryEntry {
  /** Long-form name shown bold at the top of the tooltip. */
  term: string
  /** One- or two-sentence plain-English explanation. */
  definition: string
  /** Optional framework tag (e.g. 'CSRD', 'ISSB', 'GHG Protocol'). */
  framework?: string
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ── Frameworks / regulations ─────────────────────────────────
  CSRD: {
    term: 'Corporate Sustainability Reporting Directive',
    definition: 'EU regulation requiring large companies to publish detailed sustainability reports aligned with ESRS standards. First reports were due in 2025 for FY2024 data.',
    framework: 'EU',
  },
  ESRS: {
    term: 'European Sustainability Reporting Standards',
    definition: 'The 12 standards (ESRS 1, 2, plus E1–E5, S1–S4, G1) that define what to disclose under CSRD.',
    framework: 'EU',
  },
  'ESRS E1': {
    term: 'ESRS E1 — Climate Change',
    definition: 'European Sustainability Reporting Standard E1: discloses how an organisation manages climate-related risks and opportunities under the CSRD, including transition plans and GHG emissions.',
    framework: 'CSRD',
  },
  'ESRS E2': {
    term: 'ESRS E2 — Pollution',
    definition: 'Disclosures on pollution of air, water and soil; substances of concern; and microplastics under the CSRD.',
    framework: 'CSRD',
  },
  'ESRS E3': {
    term: 'ESRS E3 — Water & Marine Resources',
    definition: 'Disclosures covering water withdrawal, consumption and discharge, water-stressed-area operations, and marine resource impacts.',
    framework: 'CSRD',
  },
  'ESRS E4': {
    term: 'ESRS E4 — Biodiversity & Ecosystems',
    definition: 'Disclosures on biodiversity-sensitive sites, IUCN species impacted, restoration projects, and no-net-loss ambitions.',
    framework: 'CSRD',
  },
  'ESRS E5': {
    term: 'ESRS E5 — Resource Use & Circular Economy',
    definition: 'Disclosures on material inflows, product circularity, waste by treatment route, and recycled content.',
    framework: 'CSRD',
  },
  'ESRS S1': {
    term: 'ESRS S1 — Own Workforce',
    definition: 'Workforce characteristics, diversity, collective bargaining, health & safety, training, pay gaps and incidents within the reporting entity.',
    framework: 'CSRD',
  },
  'ESRS S2': {
    term: 'ESRS S2 — Value Chain Workers',
    definition: 'Human rights due diligence and severe incidents across the value chain workforce — i.e., people who work for suppliers, not your direct employees.',
    framework: 'CSRD',
  },
  'ESRS S3': {
    term: 'ESRS S3 — Affected Communities',
    definition: 'Engagement, grievance channels and impact metrics for communities affected by your operations, including FPIC and resettlement.',
    framework: 'CSRD',
  },
  'ESRS S4': {
    term: 'ESRS S4 — Consumers & End-Users',
    definition: 'Disclosures covering product safety incidents, recalls, data privacy breaches and responsible marketing.',
    framework: 'CSRD',
  },
  'ESRS G1': {
    term: 'ESRS G1 — Business Conduct',
    definition: 'Disclosures on anti-corruption, whistleblower mechanisms, political contributions and payment practices to suppliers.',
    framework: 'CSRD',
  },
  'ESRS E1-6': {
    term: 'Gross GHG Emissions Disclosure',
    definition: 'CSRD disclosure for Scope 1, 2 and 3 greenhouse gas emissions, with biogenic CO2 reported separately from the totals.',
    framework: 'CSRD',
  },
  GRI: {
    term: 'Global Reporting Initiative',
    definition: 'Voluntary international sustainability reporting standard — the most widely-adopted ESG framework globally.',
  },
  TCFD: {
    term: 'Task Force on Climate-related Financial Disclosures',
    definition: 'Voluntary framework recommending climate disclosures across four pillars: Governance, Strategy, Risk Management, and Metrics & Targets.',
  },
  ISSB: {
    term: 'International Sustainability Standards Board',
    definition: 'IFRS Foundation body producing IFRS S1 (general sustainability) and IFRS S2 (climate) — the global "baseline" sustainability standards.',
  },
  'IFRS S1': {
    term: 'IFRS S1 — General Sustainability',
    definition: 'Investor-grade general sustainability disclosures: governance, strategy, risk management and metrics across all material topics.',
    framework: 'ISSB',
  },
  'IFRS S2': {
    term: 'IFRS S2 — Climate',
    definition: 'Investor-grade climate disclosures harmonised with TCFD; mandatory in the UK and several jurisdictions from 2025.',
    framework: 'ISSB',
  },
  SASB: {
    term: 'Sustainability Accounting Standards Board',
    definition: 'Industry-specific sustainability disclosure standards, now consolidated under the ISSB as the SASB Standards.',
  },
  CDP: {
    term: 'CDP (formerly Carbon Disclosure Project)',
    definition: 'Annual questionnaire requested by investors covering Climate Change, Water Security and Forests. CDP scoring is widely used by analysts.',
  },
  'EU Taxonomy': {
    term: 'EU Taxonomy Alignment',
    definition: 'Turnover, CapEx and OpEx eligibility and alignment across the six environmental objectives, plus DNSH (Do No Significant Harm) and minimum safeguards.',
    framework: 'EU',
  },
  'SB 253': {
    term: 'California SB 253 (CCDAA)',
    definition: 'California rule requiring Scope 1+2 from FY2026 and Scope 3 from FY2027 for $1B+ revenue entities doing business in California.',
    framework: 'US — CA',
  },
  'SB 261': {
    term: 'California SB 261 (Climate Risk)',
    definition: 'California biennial climate-related financial risk report aligned with TCFD for $500M+ revenue entities doing business in California.',
    framework: 'US — CA',
  },
  SEC: {
    term: 'SEC Climate Disclosure Rule',
    definition: 'Final 2024 SEC rule covering material climate risks, governance, targets, Scope 1+2 (where material) and severe-weather financial-statement impacts.',
    framework: 'US',
  },

  // ── Materiality / methodology ────────────────────────────────
  DMA: {
    term: 'Double Materiality Assessment',
    definition: 'CSRD requirement to assess each topic from both impact materiality (effect on people/environment) AND financial materiality (effect on enterprise value).',
    framework: 'CSRD',
  },
  'Double Materiality': {
    term: 'Double Materiality',
    definition: 'The combination of impact materiality (your effect on the world) and financial materiality (the world\'s effect on your enterprise value). Required by CSRD.',
    framework: 'CSRD',
  },
  IRO: {
    term: 'Impact, Risk, Opportunity',
    definition: 'Under CSRD double materiality, each material topic is broken into specific impacts (on people/planet), risks (financial downsides) and opportunities (financial upsides).',
    framework: 'CSRD',
  },

  // ── GHG accounting ───────────────────────────────────────────
  GHG: {
    term: 'Greenhouse Gas',
    definition: 'Gases that trap heat in the atmosphere — primarily CO2, CH4 (methane), N2O (nitrous oxide), plus fluorinated gases (HFCs, PFCs, SF6, NF3).',
  },
  'Scope 1': {
    term: 'Scope 1 Emissions',
    definition: 'Direct GHG emissions from sources owned or controlled by the reporting company — e.g. on-site combustion, company vehicles, fugitive refrigerant releases.',
    framework: 'GHG Protocol',
  },
  'Scope 2': {
    term: 'Scope 2 Emissions',
    definition: 'Indirect GHG emissions from purchased electricity, steam, heating or cooling. Reported under both location-based and market-based methods.',
    framework: 'GHG Protocol',
  },
  'Scope 3': {
    term: 'Scope 3 Emissions',
    definition: 'All other indirect emissions in the value chain — 15 categories spanning purchased goods, employee commute, business travel, downstream product use and more.',
    framework: 'GHG Protocol',
  },
  EF: {
    term: 'Emission Factor',
    definition: 'A multiplier that converts activity data (kWh of electricity, litres of fuel, tonnes of material) into kg CO2e. Sourced from authorities such as DEFRA, EPA, IPCC and IEA.',
  },
  GWP: {
    term: 'Global Warming Potential',
    definition: 'How much heat a GHG traps in the atmosphere relative to CO2 over 100 years. Used to convert non-CO2 gases into CO2-equivalent.',
  },
  'IPCC AR5': {
    term: 'IPCC Assessment Report 5',
    definition: 'IPCC consensus GWP values published in 2014, still widely used to standardise GHG calculations across years.',
  },
  'IPCC AR6': {
    term: 'IPCC Assessment Report 6',
    definition: 'IPCC consensus GWP values published in 2021–2023. Most recent jurisdictions require AR6 for new reporting cycles.',
  },
  CO2e: {
    term: 'CO2 Equivalent',
    definition: 'A common unit combining all greenhouse gases using their GWP — lets you express, say, methane emissions in the same units as CO2.',
  },
  'SBTi': {
    term: 'Science Based Targets initiative',
    definition: 'Independent body that validates corporate emissions reduction targets against climate science (1.5 °C pathway).',
  },

  // ── Reporting / assurance ────────────────────────────────────
  iXBRL: {
    term: 'inline eXtensible Business Reporting Language',
    definition: 'XHTML-embedded XBRL tags that make sustainability disclosures machine-readable. Required for ESRS filings in the EU.',
  },
  XBRL: {
    term: 'eXtensible Business Reporting Language',
    definition: 'Open international standard for digital business reporting — the file format regulators ingest for analysis.',
  },
  'ISAE 3000': {
    term: 'International Standard on Assurance Engagements 3000',
    definition: 'IAASB standard auditors apply when providing limited or reasonable assurance over non-financial information such as sustainability data.',
  },
  'Limited Assurance': {
    term: 'Limited Assurance',
    definition: 'The lower of two assurance levels: the auditor concludes that nothing came to attention causing them to believe the data is materially misstated.',
  },
  'Reasonable Assurance': {
    term: 'Reasonable Assurance',
    definition: 'The higher of two assurance levels: a positive opinion that the data is, in all material respects, presented fairly. Required for some CSRD elements from 2028.',
  },
  'Audit Trail': {
    term: 'Audit Trail',
    definition: 'A tamper-evident record of every change made to data: who edited a number, when, and what the previous value was. Required to support assurance.',
  },
  OpenTimestamps: {
    term: 'OpenTimestamps',
    definition: 'Open standard that anchors a hash of your data to the Bitcoin blockchain, providing cryptographic proof that a value existed at a point in time.',
  },

  // ── Identity / security ──────────────────────────────────────
  SCIM: {
    term: 'System for Cross-domain Identity Management',
    definition: 'Open standard for automatically syncing users from your identity provider (Azure AD, Okta, Google Workspace) into the app.',
  },
  SAML: {
    term: 'Security Assertion Markup Language',
    definition: 'XML-based protocol that lets users sign in once via their company identity provider and reach multiple apps without re-typing credentials.',
  },
  SSO: {
    term: 'Single Sign-On',
    definition: 'One sign-in via your identity provider unlocks every app the IdP trusts. Implemented via SAML or OIDC.',
  },
  MFA: {
    term: 'Multi-Factor Authentication',
    definition: 'Requires a second proof of identity beyond password — typically a 6-digit TOTP code from an authenticator app.',
  },
  TOTP: {
    term: 'Time-based One-Time Password',
    definition: 'A 6-digit code generated by an authenticator app (Google Authenticator, 1Password) that rotates every 30 seconds. Used for MFA.',
  },
  RBAC: {
    term: 'Role-Based Access Control',
    definition: 'Permissions are granted to roles (e.g. Platform Admin, Auditor), and users are assigned to roles — rather than granting permissions to individuals directly.',
  },
}

/** Look up a glossary entry by key. Returns `undefined` when not found. */
export function getGlossary(term: string): GlossaryEntry | undefined {
  return GLOSSARY[term]
}
