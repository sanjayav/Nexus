# Enterprise Reporting Dashboard - Architecture

## Overview

This is a comprehensive, enterprise-level sustainability reporting platform built with React, TypeScript, and React Router. The system follows a modular architecture designed for blockchain-anchored ESG reporting with GRI, MSX, IFRS S1/S2, and regulatory compliance.

## North-Star Experience

**One modular entry → Complete reporting lifecycle**

1. **Landing** (`/modules`) - Select reporting modules (GRI, MSX, IFRS S1/S2)
2. **Questionnaire** - Schema-driven data entry with autosave and validation
3. **Review → Approvals** - Chain-aware approval workflow with DID/VC
4. **Publish** - Generate packs, PDFs, and anchor roll-up roots
5. **Dashboards** - Analytics (practitioner-focused) and Executive (leadership)
6. **Universal Tools** - Evidence Library and Verification Center always accessible

## Route Structure

```
/                           → Redirects to /modules
/modules                    → Landing page with module cards
/modules/:moduleId          → Module Hub (progress, tasks, versions)
/modules/:moduleId/questionnaire → Schema-driven form
/modules/:moduleId/review   → Review & Approvals page
/reports/:periodId/build    → Report Builder

/analytics                  → Analysis Dashboard (deep metrics)
/executive                  → Executive Overview (publish gates)

/evidence                   → Evidence Library (universal)
/verify                     → Verification Center (universal)
/events                     → Anchors & Events (auditor explorer)
/admin                      → Admin & Settings (chain, SSO, RBAC)
```

## Key Pages

### 1. Modules Landing (`/modules`)
- **Purpose**: Fast entry + clear jump to dashboards
- **Features**:
  - Module cards with coverage %, state, last activity
  - Primary CTA: Continue Questionnaire
  - Secondary: Open Module Hub
  - Quick actions: Open Analytics, Open Executive
  - Per-module analytics/executive links

### 2. Module Hub (`/modules/:moduleId`)
- **Purpose**: One place per module for progress, tasks, and versions
- **Features**:
  - Progress rail: Upload → Validation → Roots → Index/Pack → Roll-up
  - Your tasks: failed validations, missing evidence, awaiting review
  - Version sidebar: v1/v2/v3 with diff quick view
  - Actions: Continue Questionnaire, Request Review, Generate Pack

### 3. Questionnaire (`/modules/:moduleId/questionnaire`)
- **Purpose**: Schema-driven, auditor-friendly data entry
- **Layout**:
  - Left: Section navigation (GRI 2-1, etc.)
  - Center: Dynamic form (text, textarea, select, date, file)
  - Right: Clause guidance, examples, evidence linking
- **Features**:
  - Autosave every few seconds
  - Inline validation tips
  - Keyboard navigation
  - Save Draft, Validate, Anchor Clean buttons

### 4. Review & Approvals (`/modules/:moduleId/review`)
- **Purpose**: Move Clean → Approved with traceable sign-off
- **Tabs**:
  - Findings: validation failures, missing fields
  - Diffs: changes vs previous submission
  - Proofs: CID, SHA-256, merkle root, tx link
  - Approvals: DID/role + vcHash visible
- **Features**:
  - Approve/Reject with comments
  - SLA timers
  - Auto-nudges to approvers

### 5. Report Builder (`/reports/:periodId/build`)
- **Purpose**: Produce packs + PDF and anchor roll-up
- **Sections**:
  - Select modules to include
  - Report metadata (title, languages)
  - Outputs: Public Pack, PDF, Data Exports, GRI Index
  - Publish gate checks
- **Actions**:
  - Publish & Anchor Roll-up (gated)
  - Preview Report
  - Download formats

### 6. Analytics Dashboard (`/analytics`)
- **Purpose**: Deep analysis for practitioners
- **Features**:
  - Theme gauges (Governance, Strategy, Risk, Metrics)
  - Performance trend (E/S/G lines, anchored points)
  - Evidence heatmap (months × modules)
  - Latest anchors & verification status
  - Top validation failures
  - Sticky filters: Period, BU, Site, Module

### 7. Executive Overview (`/executive`)
- **Purpose**: Leadership snapshot
- **Features**:
  - Coverage per module, DMA %, Integrity Index
  - Approvals funnel
  - Risk flags (overdue reviews, missing anchors)
  - Publish gate status
  - Actions: Preview, Publish Period Pack, Download Audit

### 8. Evidence Library (`/evidence`)
- **Purpose**: Control room for artifacts & certificates
- **Features**:
  - Table with filters: Module, Type, Anchored?, Date
  - Columns: EvidenceId, CID, SHA-256, Module, Status
  - Badges: Re-use, Expiring certificates
  - Actions: Preview, Open IPFS, Link to submission

### 9. Verification Center (`/verify`)
- **Purpose**: Anyone can check an artifact
- **Modes**:
  - Paste proof bundle
  - Pick from Evidence
- **Result**: ✅/❌, chainId, block, txHash, period/module
- **Export**: Signed JSON + PDF verification report

### 10. Anchors & Events (`/events`)
- **Purpose**: Auditor explorer
- **Features**:
  - Filters: event type, module, DID, date
  - Table: event, IDs, merkle root, CID, txHash
  - Mini charts: events/day, time-to-approve
  - Actions: CSV/JSON export, Generate Audit Pack

### 11. Admin & Settings (`/admin`)
- **Purpose**: System configuration
- **Sections**:
  - Chain & Relayer: addresses, ABIs, health, gas
  - Storage: IPFS/Filecoin pinning, retention
  - Validation: schema versions, rule toggles
  - SSO/RBAC: SAML/OIDC mapping
  - Webhooks & SLAs: Slack/Email, thresholds

## Data Model

### Core Objects

```typescript
Submission {
  submissionId: string
  moduleId: string
  periodId: string
  state: 'Open' | 'In Review' | 'Approved' | 'Published'
  payloadCID: string
  sha256: string
  merkleRoot: string
  prevSubmissionId?: string
  createdBy: string (DID)
  createdAt: string
}

Evidence {
  evidenceId: string
  cid: string
  sha256: string
  mime: string
  linkedModule?: string
  linkedSubmissionId?: string
  addedBy: string (DID)
  addedAt: string
  pinned: boolean
}

Approval {
  submissionId: string
  vcHash: string
  did: string
  role: string
  decision: 'approve' | 'reject'
  comment: string
  timestamp: string
}

Module {
  id: string
  title: string
  coverage: number (0-100)
  state: string
  submissionId: string
  questionnaireSections: number
  completedSections: number
  validationsPassed: boolean
}
```

## Design System

### Colors
- **Accent**: `#00D48E` (emerald/teal)
- **Background**: `#0B1220` (dark navy)
- **Surface**: `#141C2A` (lighter navy)
- **Border**: `#233047` (subtle gray-blue)

### Typography
- **Font**: Inter (system fallback: system-ui, -apple-system)
- **Sizes**: 
  - Headings: 3xl (30px), 2xl (24px), lg (18px)
  - Body: base (16px), sm (14px), xs (12px)

### Components
- **Cards**: rounded-2xl (16px), soft borders, dark surfaces
- **Buttons**: rounded-xl (12px), hover transitions, disabled states
- **Pills/Badges**: rounded, colored backgrounds with matching borders
- **Focus**: 2px accent ring with offset

### Status Colors
- **Open**: Blue (bg-blue-500/10, text-blue-400)
- **In Review**: Yellow (bg-yellow-500/10, text-yellow-400)
- **Approved**: Emerald (bg-emerald-500/10, text-emerald-400)
- **Published**: Purple (bg-purple-500/10, text-purple-400)
- **Error**: Red (bg-red-500/10, text-red-400)

## Navigation Flow

### Primary Flow (Module Completion)
1. Landing → Select Module
2. Module Hub → View Progress
3. Questionnaire → Complete Sections
4. Module Hub → Request Review
5. Review → Approve/Reject
6. Report Builder → Publish

### Analytics Flow
1. Landing → Open Analytics
2. Drill into specific metrics
3. Filter by Period/BU/Site/Module
4. Export data or reports

### Executive Flow
1. Landing → Open Executive
2. Review publish gates
3. Check integrity index
4. Preview or Publish report

### Verification Flow
1. Header → Verification Center (always accessible)
2. Paste proof or select evidence
3. Verify on-chain
4. Export verification report

## Technical Stack

- **Frontend**: React 18 + TypeScript
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS (dark-first theme)
- **Icons**: Lucide React
- **Charts**: Recharts (for Analytics/Executive dashboards)
- **Build**: Vite
- **State**: React hooks (useState, useEffect)

## RBAC Implementation

### Roles
- **Analyst**: Questionnaire, Analytics, Evidence (no Approve/Publish)
- **Reviewer**: Review page, Request changes
- **Approver**: Approve/Reject, Publish
- **Assurer**: Read-only + Verification Center, Audit Pack
- **Admin**: Admin & Settings, manage modules/SSO/SLAs

### Permissions Matrix
```
Page                 | Analyst | Reviewer | Approver | Assurer | Admin
---------------------|---------|----------|----------|---------|-------
Modules Landing      |    ✓    |    ✓     |    ✓     |    ✓    |   ✓
Questionnaire        |    ✓    |    ✓     |    ✓     |    ✗    |   ✓
Review               |    ✗    |    ✓     |    ✓     |    ✓    |   ✓
Approve/Reject       |    ✗    |    ✗     |    ✓     |    ✗    |   ✓
Publish              |    ✗    |    ✗     |    ✓     |    ✗    |   ✓
Analytics            |    ✓    |    ✓     |    ✓     |    ✓    |   ✓
Executive            |    ✗    |    ✗     |    ✓     |    ✓    |   ✓
Evidence Library     |    ✓    |    ✓     |    ✓     |    ✓    |   ✓
Verification Center  |    ✓    |    ✓     |    ✓     |    ✓    |   ✓
Admin & Settings     |    ✗    |    ✗     |    ✗     |    ✗    |   ✓
```

## Future Enhancements

1. **Real-time Collaboration**: Multiple users editing questionnaire simultaneously
2. **AI Assistance**: Auto-complete suggestions based on past submissions
3. **Advanced Search**: Full-text search across all submissions/evidence
4. **Mobile App**: Native mobile experience for approvers
5. **Multi-tenant**: Support multiple organizations with data isolation
6. **External Integrations**: Connect to ERP, HCM, energy management systems
7. **Custom Workflows**: Configurable approval chains per module
8. **Notifications**: Real-time alerts via WebSocket + push notifications

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Focus Management**: Clear focus rings and logical tab order
- **ARIA Labels**: Proper semantic HTML and ARIA attributes
- **Screen Reader**: Tested with VoiceOver/NVDA
- **Color Contrast**: WCAG AA compliant contrast ratios
- **Error Handling**: Clear, actionable error messages

## Performance

- **Code Splitting**: Dynamic imports for heavy pages
- **Lazy Loading**: Images and charts load on demand
- **Caching**: IPFS content cached locally
- **Optimistic Updates**: UI updates before server confirmation
- **Virtual Scrolling**: For large tables (Evidence Library, Events)

## Security

- **DID/VC**: Decentralized identities for all actions
- **IPFS Pinning**: Content-addressed storage
- **On-chain Anchoring**: Immutable audit trail
- **Role-based Access**: Granular permissions per user
- **Proof Verification**: Anyone can verify authenticity
- **Encryption**: Evidence encrypted at rest (optional)

---

Built with ❤️ for transparent, verifiable ESG reporting.

