# Enterprise Reporting Dashboard - User Guide

## Getting Started

### Accessing the Dashboard

1. Open your browser and navigate to the dashboard URL
2. You'll land on the **Modules Landing Page** showing all available reporting modules
3. The header shows:
   - **Tenant selector**: Switch between organizations (Asyad)
   - **Period selector**: Choose reporting period (FY2025)
   - **Global filters**: Business Unit, Site, Module, Date
   - **Search bar**: Find by CID, submissionId, or evidenceId
   - **System status**: Chain, Relayer, IPFS status
   - **User menu**: Profile and settings

## Main Workflows

### 1. Complete a Reporting Module

#### Step 1: Select Your Module
- From the **Modules Landing** page, browse available modules:
  - **GRI Standards**: Comprehensive sustainability framework
  - **MSX**: Stock exchange ESG requirements
  - **IFRS S1**: General sustainability disclosures
  - **IFRS S2**: Climate-related disclosures
- Each card shows:
  - Coverage percentage
  - State (Open, In Review, Approved, Published)
  - Last activity timestamp
  - Completed sections vs total

#### Step 2: Navigate to Module Hub
- Click **"Open Module Hub"** to see detailed progress
- View the **Progress Pipeline**:
  1. ✓ Upload (complete)
  2. ⏳ Validation (in progress)
  3. ⏸ Roots (DMA) (pending)
  4. ⏸ Index/Pack (pending)
  5. ⏸ Roll-up (pending)
- Check **Your Tasks** panel for:
  - Failed validations (needs attention)
  - Missing evidence (upload required)
  - Items awaiting review (assigned to you)
- Review **Version History** in the sidebar
  - See v1, v2, v3 with quick diffs
  - Each version shows state and timestamp

#### Step 3: Fill Out the Questionnaire
- Click **"Continue Questionnaire"**
- **Left Sidebar**: Navigate between sections
  - Green checkmark = completed
  - Gray circle = not started
  - Progress bar shows overall completion
- **Center Panel**: Fill out the form
  - Required fields marked with *
  - Text inputs, textareas, selects, dates
  - Autosaves every few seconds (watch for ✓ Saved)
  - Click **"Link Evidence"** to attach files
- **Right Drawer**: View guidance
  - Clause explanation and examples
  - Last anchor information
  - Validation rules
- **Top Actions**:
  - **Save Draft**: Manual save
  - **Validate**: Run validation checks
  - **Anchor Clean**: Anchor to blockchain when ready
  - **Request Review**: Submit for approval

#### Step 4: Submit for Review
- When all sections are complete, click **"Request Review"**
- Select an approver from the team
- Add a comment explaining what's ready
- The module state changes to "In Review"

#### Step 5: Review & Approval
*If you're an approver:*
- Navigate to **Review page** from Module Hub
- Review the **Findings** tab:
  - Errors (must fix)
  - Warnings (consider addressing)
  - Info (nice to have)
- Check **Validation Diffs**:
  - See what changed from previous version
  - Red lines = removed
  - Green lines = added
- Verify **Proofs**:
  - Payload CID on IPFS
  - SHA-256 hash
  - Merkle root
  - Transaction link
- View **Approvals** history:
  - Past decisions with comments
  - DID and role of each approver
- **Make Your Decision**:
  - Click **Approve** or **Reject**
  - Add a comment (required for reject)
  - Click **Submit Decision**
  - Your DID and VC hash are recorded on-chain

### 2. Build and Publish a Report

#### Step 1: Navigate to Report Builder
- From sidebar, click **"Report Builder"**
- Or go to `/reports/FY2025/build`

#### Step 2: Select Modules
- Check the modules you want to include
- Only **Approved** modules can be published
- Review coverage and sections for each

#### Step 3: Configure Metadata
- Set report title (e.g., "FY2025 Sustainability Report")
- Select languages (English, Arabic, French)
- Toggle "Include annexes" for GRI Index and methodology

#### Step 4: Generate Outputs
- **Public Pack**: IndexCID + checksums (click Generate Pack)
- **PDF Report**: Styled document with annexes (click Generate PDF)
- **Data Exports**: JSON/CSV/XML formats (click Export Data)
- **GRI Index**: Complete content index (click Export Index)

#### Step 5: Publish Gate Checks
*Right panel shows blockers:*
- ✓ Modules Selected
- ✓ All Approved
- ✓ No Critical Findings
- ✓ Evidence Linked

#### Step 6: Publish & Anchor
- When all gates pass, click **"Publish & Anchor Roll-up"**
- System generates:
  - Index CID
  - Rollup root
  - Transaction on blockchain
- Report state changes to "Published"

### 3. Analyze Performance

#### Analytics Dashboard (for practitioners)
- Click **"Open Full Analytics"** from landing page
- Or navigate to `/analytics`
- **Theme Gauges**: See scores for Governance, Strategy, Risk, Metrics
- **Performance Trend**: E/S/G over time with anchored points
- **Evidence Heatmap**: Uploads by month and module (drill down)
- **Latest Anchors**: Recent blockchain transactions
- **Top Validation Failures**: Most common issues
- **Filters**: Apply Period, BU, Site, Module filters (sticky)

#### Executive Overview (for leadership)
- Click **"Open Executive Summary"** from landing page
- Or navigate to `/executive`
- **Coverage per Module**: Visual gauges
- **DMA Percentage**: Material topics covered
- **Integrity Index**: Overall score (0-100)
- **Approvals Funnel**: Submitted → In Review → Approved → Published
- **Risk Flags**: Overdue reviews, missing critical anchors
- **Publish Gate Status**: What's blocking publish
- **Actions**:
  - Preview Publish
  - Publish Period Pack
  - Download Audit Pack

### 4. Manage Evidence

#### Evidence Library
- Navigate to `/evidence`
- **Table View**:
  - EvidenceId
  - CID (IPFS content ID)
  - SHA-256 hash
  - Linked module/submission
  - Anchor status
  - Added by (DID)
  - Added at (timestamp)
- **Filters**:
  - Module (GRI, MSX, etc.)
  - Type (xlsx, json, pdf, csv)
  - Anchored? (yes/no)
  - Uploader DID
  - Date range
  - Certificate Tag
- **Badges**:
  - **Re-use**: Used in >1 submission
  - **Expiring**: Certificate expiration date approaching
- **Actions**:
  - Preview: View file content
  - Open IPFS: Open in IPFS gateway
  - Link: Attach to questionnaire item

### 5. Verify Artifacts

#### Verification Center
- Navigate to `/verify` (accessible from header)
- **Mode 1: Paste Proof Bundle**
  - Copy proof JSON from export
  - Paste into text area
  - Click **"Verify"**
- **Mode 2: Pick from Evidence**
  - Browse Evidence Library
  - Select an item
  - Click **"Verify"**
- **Result Display**:
  - ✅ Verified or ❌ Failed
  - Chain ID (zkEVM, PoS)
  - Block number
  - Transaction hash
  - Anchored timestamp
  - Matched period, module, submission
- **Export**:
  - Signed JSON bundle
  - PDF verification report

### 6. Explore Audit Trail

#### Anchors & Events
- Navigate to `/events`
- **Filters**:
  - Event type (anchor, upload, approve)
  - Module (GRI, MSX, S1, S2)
  - DID (user identifier)
  - Date range
- **Table**:
  - Event name
  - Period ID
  - Module ID
  - Submission ID
  - Merkle root
  - CID
  - Transaction hash
  - By (DID)
  - Timestamp
- **Charts**:
  - Events per day
  - Average time to approve
- **Actions**:
  - CSV export
  - JSON export
  - Generate Audit Pack

### 7. Configure System (Admin Only)

#### Admin & Settings
- Navigate to `/admin`
- **Chain & Relayer**:
  - Contract addresses
  - ABIs
  - Relayer health check
  - Gas budget
- **Storage**:
  - IPFS/Filecoin pinning settings
  - Encryption toggle
  - Retention windows
- **Validation**:
  - Schema versions per module
  - Rule toggles (enable/disable specific checks)
- **SSO/RBAC**:
  - SAML/OIDC configuration
  - Role mappings (Analyst, Reviewer, Approver, Assurer, Admin)
  - DID registration
- **Webhooks & SLAs**:
  - Slack webhook URL
  - Email SMTP settings
  - SLA thresholds:
    - Stale review (days)
    - Pin drift (replicas)
    - Overdue approvals (days)

## Tips & Best Practices

### Questionnaire
- **Save often**: Use Cmd/Ctrl+S or let autosave handle it
- **Link evidence early**: Don't wait until the end
- **Use keyboard navigation**: ↑↓ to move between fields, Tab to next section
- **Read guidance**: Right drawer has helpful examples and rules
- **Validate frequently**: Catch issues early with the Validate button

### Review
- **Check diffs carefully**: Look for unexpected changes
- **Verify proofs**: Confirm CID matches IPFS content
- **Comment thoroughly**: Help the analyst understand rejections
- **Respect SLAs**: Green timer = on time, red = overdue
- **Use findings**: Each finding has a suggestion to help fix

### Evidence
- **Tag certificates**: Mark expiration dates for TÜV, ISO, etc.
- **Re-use when possible**: Link same file to multiple submissions
- **Check anchor status**: Ensure critical evidence is on-chain
- **Keep organized**: Use descriptive filenames and consistent structure

### Analytics
- **Filter strategically**: Start broad, then narrow to specific modules
- **Export data**: Download raw data for deeper analysis in Excel/Python
- **Watch trends**: Look for patterns in the heatmap
- **Share insights**: Use screenshot or export to share with team

### Executive
- **Monitor integrity index**: Aim for >90 for high assurance
- **Fix blockers**: Address publish gate issues before deadlines
- **Preview before publish**: Catch formatting issues early
- **Download audit packs**: Keep for external auditors

## Keyboard Shortcuts

- **Cmd/Ctrl + K**: Open global search
- **Cmd/Ctrl + S**: Save draft (in questionnaire)
- **Cmd/Ctrl + Enter**: Submit (various forms)
- **↑/↓**: Navigate sections (in questionnaire)
- **Esc**: Close modals/drawers
- **Tab**: Navigate form fields
- **Shift + Tab**: Navigate backwards

## Getting Help

### In-App Help
- **Guidance drawer**: Available in questionnaire (right side)
- **Info icons**: Hover for tooltips
- **Error messages**: Include suggestions to fix

### Support Resources
- **Documentation**: `/docs` (coming soon)
- **API Reference**: `/api-docs` (coming soon)
- **Community Forum**: Link in user menu
- **Email Support**: support@example.com

### Common Issues

**Q: Why can't I approve a submission?**
A: Check your role. Only Approvers can approve/reject. Contact admin if you need the role.

**Q: Validation keeps failing on GRI 2-27**
A: This usually means evidence is missing. Link a compliance certificate or documentation.

**Q: IPFS status shows "Unpinned"**
A: Some content is not yet replicated. Admin can manually pin or wait for automatic replication.

**Q: Can I edit a Published submission?**
A: No. Published submissions are immutable. Create a new version if changes are needed.

**Q: How do I export everything for an auditor?**
A: Go to `/events` and click "Generate Audit Pack". This includes all evidence, proofs, and approvals.

---

**Need more help?** Contact your system administrator or check the Architecture documentation for technical details.

