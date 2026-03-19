# Sustainability Reporting Dashboard

A comprehensive frontend dashboard for sustainability reporting with blockchain-anchored evidence, integrity tracking, and verification capabilities.

## Features

### 📊 Executive Overview
- Framework coverage metrics (GRI, MSX, IFRS S1/S2)
- DMA completion tracking with sparklines
- GHG emissions snapshot
- Integrity index scoring
- Period roll-up with on-chain verification
- Coverage and velocity charts
- Approvals funnel and evidence heatmap
- Real-time alerts and quick actions

### 📈 Analytics Dashboard
- Semi-gauge compliance ratings (Governance, Strategy, Risk, Metrics & Targets)
- ESG performance trends with E/S/G breakdowns
- Interactive line charts showing monthly progress
- Upload interface for new data validation
- Real-time verification status tracking
- Version history with change tracking
- Quick actions for sharing and exporting
- Left navigation menu for quick access

### 🔗 Integrity Timeline
- Visual swimlanes for each module (GRI, MSX, S1, S2)
- Milestone tracking with status chips
- Bottleneck identification
- Detailed drawer with proof information
- Transaction links and evidence tracking

### ✅ Verification Center
- Paste proof bundle or pick from library
- Real-time verification results
- Download JSON proofs and signed PDF reports
- Chain verification with block details

### 📁 Evidence Library
- Searchable evidence repository
- Multiple filters (module, type, status, date)
- Evidence re-use metrics
- Certificate expiry tracking
- IPFS integration

### 🌱 GHG & Targets
- Scope 1 and Scope 2 emissions tracking
- **Scope 3 calculator** (GHG Protocol 15 categories, CPCB/CEA factors)
- Emissions trends with anchored points
- Intensity vs production analysis
- Methodology documentation
- ZK threshold compliance proofs

### 🚀 Pioneer Features
- **CSRD / ESRS** — EU sustainability reporting
- **TCFD** — Climate-related financial disclosures
- **China ESG (CASS)** — CASS framework
- **AI Studio** — AI drafting, data extraction, disclosure mapping
- **XBRL / iXBRL** — Machine-readable export (Report Builder)
- **Workflow Config** — Approval chains, SLAs, notifications
- **Multi-tenant** — Organization switcher

### 👥 Roles & Credentials
- DID management
- Verifiable credentials tracking
- Role-based access overview
- Activity monitoring

### ⚓ Anchors & Events
- Complete event audit trail
- Events over time visualization
- Approvals vs rejections analytics
- Export capabilities (CSV/JSON)
- Audit pack generation

### ⚙️ Admin & Settings
- Chain configuration
- Relayer health monitoring
- IPFS settings
- SLA thresholds
- Webhook integrations (Slack, Email)

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Lucide React** - Icons

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Design System

### Colors
- **Background**: `#0B1220`
- **Surface**: `#141C2A`
- **Border**: `#233047`
- **Text**: `#E6EAF2`
- **Accent**: `#00D48E`

### Status Colors
- **Verified/Approved**: Emerald
- **Published**: Indigo
- **Anchored**: Blue
- **Pending**: Gray
- **Failed**: Rose

### Typography
- Font: Inter
- Titles: 20-22px
- Sections: 16-18px
- Body: 14-15px
- Monospace: For hashes and technical data

## Mock Data

The dashboard uses comprehensive mock data located in `src/data/mockData.ts`. All metrics are consistent and properly calculated:

- Framework coverage: 86% (GRI), 72% (MSX), 64% (S1), 58% (S2)
- DMA completion: 84% (21/25 topics)
- Integrity index: 92/100
- Evidence items: 487 pinned
- Active DIDs: 3 roles

## Project Structure

```
src/
├── components/
│   ├── Header.tsx          # Top navigation bar
│   └── Sidebar.tsx         # Left navigation menu
├── pages/
│   ├── ExecutiveOverview.tsx
│   ├── AnalyticsDashboard.tsx  # NEW: Analysis-focused dashboard
│   ├── IntegrityTimeline.tsx
│   ├── VerificationCenter.tsx
│   ├── EvidenceLibrary.tsx
│   ├── GHGTargets.tsx
│   ├── RolesCredentials.tsx
│   ├── AnchorsEvents.tsx
│   └── AdminSettings.tsx
├── data/
│   └── mockData.ts         # Mock data for all pages
├── App.tsx                 # Main app component
├── main.tsx               # Entry point
└── index.css              # Global styles
```

## Accessibility

- Keyboard-navigable widgets
- Focus rings on interactive elements
- ARIA labels for charts
- High contrast mode support
- Semantic HTML structure

## Performance

- Virtualized tables for large datasets
- Lazy loading for heavy components
- Optimized re-renders
- Client-side caching

## Future Enhancements

- Real API integration
- WebSocket for real-time updates
- Advanced filtering and sorting
- Export templates customization
- Multi-tenant support
- Mobile responsive views

## License

Proprietary - Aeiforo

## Contact

For questions or support, please contact the development team.

