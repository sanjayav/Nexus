import { useCallback, useState } from 'react'
import { Coins, Landmark, Leaf, Plus, Zap } from 'lucide-react'
import { AnimatedNumber, Button, PageHeader, Stagger, StaggerItem, Stat, StatStrip } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { carbonAssetsStrings } from './carbonAssets.strings'
import { useCarbonAssets } from './hooks'
import { ReconCard } from './components/ReconCard'
import { LedgerCard } from './components/LedgerCard'
import { AddContractSheet } from './components/AddContractSheet'
import { CreditsCard } from './components/CreditsCard'
import { EtsCard } from './components/EtsCard'

export default function CarbonAssetsPage() {
  const { workspace } = useWorkspace()
  // Keyed so filters and open sheets never carry across tenants.
  return <CarbonAssetsView key={workspace.id} />
}

function CarbonAssetsView() {
  const s = useStrings(carbonAssetsStrings)
  const f = useFormat()
  const { workspace, region } = useWorkspace()
  const view = useCarbonAssets()
  const [adding, setAdding] = useState(false)
  // Stable: the sheet's dismiss effect re-runs (and refocuses) whenever onClose changes.
  const closeSheet = useCallback(() => setAdding(false), [])
  const openSheet = useCallback(() => setAdding(true), [])
  const int = useCallback((n: number) => f.number(Math.round(n)), [f])
  const k = s.kpi

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={fmt(s.eyebrow, { year: workspace.reportingYear })}
        title={s.title}
        description={s.description}
        actions={
          <Button variant="primary" icon={Plus} onClick={openSheet}>
            {s.ledger.add}
          </Button>
        }
      />

      <Stagger className="space-y-6">
        <StaggerItem>
          <StatStrip>
            <Stat
              label={k.instruments[region.id]}
              icon={Zap}
              value={<AnimatedNumber value={view.scope2.instrumentMWh} format={int} />}
              unit="MWh"
              deltaLabel={fmt(k.instrumentsCaption, { value: f.number(view.scope2.selfMWh) })}
            />
            <Stat
              label={k.market}
              icon={Leaf}
              value={<AnimatedNumber value={view.scope2.market} format={int} />}
              unit="tCO₂e"
              deltaLabel={fmt(k.marketCaption, { value: f.number(view.location) })}
            />
            <Stat
              label={k.credits}
              icon={Coins}
              value={<AnimatedNumber value={view.credit.held} format={int} />}
              unit="tCO₂e"
              deltaLabel={fmt(k.creditsCaption, { value: f.number(view.credit.retired) })}
            />
            <Stat label={k.ets[region.id]} icon={Landmark} value={k.etsValue[region.id]} deltaLabel={k.etsCaption[region.id]} />
          </StatStrip>
        </StaggerItem>
        <StaggerItem>
          <ReconCard view={view} />
        </StaggerItem>
        <StaggerItem>
          <LedgerCard view={view} onAdd={openSheet} />
        </StaggerItem>
        <StaggerItem>
          <CreditsCard view={view} />
        </StaggerItem>
        <StaggerItem>
          <EtsCard ets={view.ets} scenarioOn={view.etsScenario} />
        </StaggerItem>
      </Stagger>

      <AddContractSheet open={adding} onClose={closeSheet} view={view} />
    </div>
  )
}
