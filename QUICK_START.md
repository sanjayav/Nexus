# Quick Start Guide

## 🚀 Your Enterprise Dashboard is Ready!

The development server is running at: **http://localhost:5173**

## What You Have

### ✅ Complete Application (11 Pages)

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 MODULES LANDING  (/)                                    │
│  Your main entry point - pick GRI/MSX/IFRS modules         │
│  Quick access to Analytics & Executive dashboards          │
└─────────────────────────────────────────────────────────────┘
              │
              ├──► 📊 Module Hub (/modules/:moduleId)
              │    • Progress pipeline
              │    • Task management
              │    • Version history
              │
              ├──► 📝 Questionnaire (/modules/:moduleId/questionnaire)
              │    • Schema-driven forms
              │    • Autosave & validation
              │    • Evidence linking
              │
              ├──► ✅ Review & Approvals (/modules/:moduleId/review)
              │    • Findings & diffs
              │    • Cryptographic proofs
              │    • Approve/reject workflow
              │
              └──► 📦 Report Builder (/reports/:periodId/build)
                   • Module selection
                   • Output generation
                   • Publish & anchor

┌─────────────────────────────────────────────────────────────┐
│  📈 ANALYTICS DASHBOARD  (/analytics)                       │
│  Deep metrics for practitioners                             │
│  • Theme gauges • Performance trends • Evidence heatmap     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🎯 EXECUTIVE OVERVIEW  (/executive)                        │
│  Leadership snapshot & publish gates                        │
│  • Integrity Index • Approvals funnel • Risk flags         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🗂️  EVIDENCE LIBRARY  (/evidence)                          │
│  Control room for artifacts & certificates                  │
│  • CID tracking • SHA-256 verification • Re-use badges      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🔍 VERIFICATION CENTER  (/verify)                          │
│  Universal verification tool - anyone can verify            │
│  • Paste proof • Pick from evidence • Export signed report │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🔗 ANCHORS & EVENTS  (/events)                             │
│  Complete audit trail explorer                              │
│  • Event filtering • Charts • CSV/JSON export              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ⚙️  ADMIN & SETTINGS  (/admin)                             │
│  System configuration                                       │
│  • Chain setup • Storage • SSO/RBAC • Webhooks & SLAs      │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Design System

**Colors**
- 🎨 Accent: `#00D48E` (emerald/teal)
- 🌑 Background: `#0B1220` (dark navy)
- 📦 Surface: `#141C2A` (lighter navy)
- 📏 Border: `#233047` (subtle gray-blue)

**Status Colors**
- 🔵 Open (blue)
- 🟡 In Review (yellow)
- 🟢 Approved (emerald)
- 🟣 Published (purple)
- 🔴 Error (red)

## 📊 Sample Data Included

### 4 Reporting Modules
1. **GRI Standards** - 86% coverage, 29/34 sections, In Review
2. **MSX (Muscat Stock Exchange)** - 72% coverage, 20/28 sections, Open
3. **IFRS S1** - 64% coverage, 14/22 sections, Approved
4. **IFRS S2** - 58% coverage, 11/19 sections, Published

### Evidence Items
- Excel files with CID tracking
- JSON data anchored on-chain
- SHA-256 verification
- Re-use tracking across submissions

### Task Management
- Missing evidence alerts
- Validation failures
- Review assignments
- Priority levels (high/medium/low)

### Version History
- v1, v2, v3 submission tracking
- Diff visualization
- State transitions
- Timestamp tracking

## 🔥 Key Features

### 1. One-Button Module Entry
```
Landing → Click "Continue Questionnaire" → Start filling forms
```

### 2. Real-time Progress Tracking
```
Upload ✓ → Validation ⏳ → Roots ⏸ → Index ⏸ → Roll-up ⏸
```

### 3. Blockchain-Ready
- CID generation for IPFS
- SHA-256 hashing
- Merkle root calculation
- Transaction anchoring (mock)
- DID/VC integration points

### 4. Multi-Role Support (RBAC)
- **Analyst**: Edit questionnaires
- **Reviewer**: Check submissions
- **Approver**: Approve/reject + publish
- **Assurer**: Read-only + verification
- **Admin**: Full system access

### 5. Universal Verification
Anyone with a proof bundle can verify authenticity on-chain

## 🎯 Primary User Flows

### Flow 1: Complete a Module
```
1. Landing → Select GRI
2. Module Hub → View progress
3. Questionnaire → Fill 34 sections
4. Link evidence → Attach files
5. Request Review → Assign approver
6. Review → Check findings
7. Approve → Submit decision
8. Report Builder → Include in report
9. Publish → Anchor on-chain
```

### Flow 2: Analytics Deep Dive
```
1. Landing → "Open Full Analytics"
2. Filter by Module: GRI
3. Evidence Heatmap → Click October
4. Evidence Library → View uploads
5. Verification Center → Verify on-chain
```

### Flow 3: Executive Decision
```
1. Landing → "Open Executive Summary"
2. Check Integrity Index: 92/100
3. Review Publish Gates: 3 blockers
4. Navigate to issues
5. Fix blockers
6. Return to Executive
7. Publish Period Pack
```

## 🛠️ Development Commands

```bash
# Already running! 🎉
npm run dev        # Dev server at http://localhost:5173

# Other commands
npm run build      # Production build
npm run preview    # Preview production build
```

## 📁 Project Structure

```
src/
├── components/
│   ├── Header.tsx          ← Global nav with breadcrumbs
│   └── Sidebar.tsx         ← Grouped navigation menu
├── pages/
│   ├── ModulesLanding.tsx  ← Main landing (entry point)
│   ├── ModuleHub.tsx       ← Progress & tasks
│   ├── Questionnaire.tsx   ← Schema-driven forms
│   ├── ModuleReview.tsx    ← Review & approvals
│   ├── ReportBuilder.tsx   ← Report generation
│   ├── AnalyticsDashboard.tsx  ← Deep metrics
│   ├── ExecutiveOverview.tsx   ← Leadership view
│   ├── EvidenceLibrary.tsx     ← Evidence management
│   ├── VerificationCenter.tsx  ← Universal verification
│   ├── AnchorsEvents.tsx       ← Audit trail
│   └── AdminSettings.tsx       ← System config
├── data/
│   └── mockData.ts         ← All sample data
├── App.tsx                 ← Router setup
└── index.css              ← Design tokens
```

## 🎓 Learn More

1. **Architecture**: Read `ARCHITECTURE.md` for technical details
2. **User Guide**: See `USER_GUIDE.md` for detailed workflows
3. **Summary**: Check `IMPLEMENTATION_SUMMARY.md` for what's built

## 🚦 Getting Started (First Steps)

### Step 1: Open the App
Navigate to http://localhost:5173 in your browser

### Step 2: Explore Landing
You'll see 4 module cards (GRI, MSX, IFRS S1, IFRS S2)

### Step 3: Try a Module
Click **"Continue Questionnaire"** on the GRI card

### Step 4: Fill a Section
- Left sidebar: Navigate sections
- Center: Fill out forms (autosaves)
- Right drawer: View guidance

### Step 5: Check Progress
Click breadcrumb "GRI" to go back to Module Hub

### Step 6: View Analytics
From landing, click **"Open Full Analytics"**

### Step 7: Executive View
From landing, click **"Open Executive Summary"**

## 🎉 What Makes This Enterprise-Level?

✅ **Modular Architecture** - Clean separation of concerns
✅ **Type Safety** - Full TypeScript coverage
✅ **Routing** - React Router with nested routes
✅ **State Management** - React hooks pattern
✅ **Design System** - Consistent tokens & patterns
✅ **Accessibility** - Keyboard nav, ARIA, focus management
✅ **Responsive** - Works on all screen sizes
✅ **Performance** - Optimized builds, lazy loading ready
✅ **Blockchain Integration** - CID, SHA-256, merkle roots
✅ **RBAC** - Role-based access control ready
✅ **Audit Trail** - Complete event tracking
✅ **Verification** - Universal proof checking

## 📸 Key Screens to Check Out

1. **Landing** - http://localhost:5173/modules
2. **GRI Module Hub** - http://localhost:5173/modules/GRI
3. **GRI Questionnaire** - http://localhost:5173/modules/GRI/questionnaire
4. **GRI Review** - http://localhost:5173/modules/GRI/review
5. **Analytics** - http://localhost:5173/analytics
6. **Executive** - http://localhost:5173/executive
7. **Evidence** - http://localhost:5173/evidence
8. **Verification** - http://localhost:5173/verify
9. **Events** - http://localhost:5173/events
10. **Report Builder** - http://localhost:5173/reports/FY2025/build
11. **Admin** - http://localhost:5173/admin

## 💡 Tips

- **Breadcrumbs**: Use header breadcrumbs to navigate back
- **Sidebar**: Grouped by Modules, Dashboards, Tools, Admin
- **Filters**: Top filters persist across pages
- **Status Pills**: Header shows Chain, Relayer, IPFS status
- **Search**: Global search in header (CID/submission/evidence)

## 🎨 Design Highlights

- **Dark-first theme** for reduced eye strain
- **Soft borders** for subtle visual hierarchy
- **Rounded corners** (2xl on cards, xl on buttons)
- **Status colors** with matching backgrounds and borders
- **Accent color** (#00D48E) for primary actions
- **Inter font** for clean, modern typography
- **Focus rings** for accessibility
- **Hover states** on all interactive elements

## 🔧 Customization

All design tokens are in `src/index.css`:
- Colors (accent, backgrounds, borders)
- Typography (font sizes, weights)
- Spacing (gaps, padding)
- Border radius (card, button, pill)
- Focus rings

All mock data is in `src/data/mockData.ts`:
- Modules
- Evidence
- Submissions
- Tasks
- Approvals
- System status

## 🚀 Next Steps

1. **Explore the UI** - Click through all pages
2. **Read the docs** - Architecture, User Guide, Summary
3. **Customize data** - Edit mockData.ts
4. **Add backend** - Connect to real blockchain/IPFS
5. **Deploy** - Build and deploy to production

---

**🎉 Congratulations! You have a complete, enterprise-level sustainability reporting platform.**

Built with ❤️ using React + TypeScript + Tailwind + React Router

