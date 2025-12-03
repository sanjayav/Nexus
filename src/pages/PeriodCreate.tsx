import { useState } from 'react';
import { Calendar, Globe, FileText, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export default function PeriodCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [period, setPeriod] = useState({
    name: 'FY2025',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    boundary: 'Group',
    regionMode: 'Global + China',
    packs: ['GRI', 'China ESG Pack'],
  });

  const handleCreate = () => {
    // In real app: POST /periods
    // Then redirect to DMA or Home
    navigate('/executive');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Create Reporting Period</h1>
        <p className="text-gray-400 mt-2">
          Set up a new reporting cycle with framework packs, scope boundary, and disclosure checklist
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {[
          { num: 1, label: 'Period Details' },
          { num: 2, label: 'Scope & Region' },
          { num: 3, label: 'Framework Packs' },
          { num: 4, label: 'Review & Create' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all',
                  step >= s.num
                    ? 'bg-accent text-dark-bg border-accent'
                    : 'bg-dark-surface text-gray-500 border-dark-border'
                )}
              >
                {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
              </div>
              <span
                className={clsx(
                  'text-xs mt-2 font-medium',
                  step >= s.num ? 'text-white' : 'text-gray-500'
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < 3 && (
              <div
                className={clsx(
                  'flex-1 h-0.5 mx-4 transition-all',
                  step > s.num ? 'bg-accent' : 'bg-dark-border'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Period Details */}
      {step === 1 && (
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-white">Period Details</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Period Name</label>
            <input
              type="text"
              value={period.name}
              onChange={(e) => setPeriod({ ...period, name: e.target.value })}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white focus:border-accent focus:outline-none"
              placeholder="e.g., FY2025"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={period.startDate}
                onChange={(e) => setPeriod({ ...period, startDate: e.target.value })}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={period.endDate}
                onChange={(e) => setPeriod({ ...period, endDate: e.target.value })}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Scope & Region */}
      {step === 2 && (
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-white">Scope Boundary & Region</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Scope Boundary</label>
            <div className="flex gap-3">
              {['Group', 'BU', 'Site', 'Asset'].map((b) => (
                <button
                  key={b}
                  onClick={() => setPeriod({ ...period, boundary: b })}
                  className={clsx(
                    'px-6 py-3 rounded-xl font-medium border transition-all',
                    period.boundary === b
                      ? 'bg-accent/10 text-accent border-accent'
                      : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Region Mode</label>
            <div className="flex gap-3">
              {['Global', 'China', 'Global + China'].map((r) => (
                <button
                  key={r}
                  onClick={() => setPeriod({ ...period, regionMode: r })}
                  className={clsx(
                    'px-6 py-3 rounded-xl font-medium border transition-all',
                    period.regionMode === r
                      ? 'bg-accent/10 text-accent border-accent'
                      : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Framework Packs */}
      {step === 3 && (
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-white">Select Framework Packs</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Choose which disclosure frameworks are required for this reporting period
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['GRI', 'IFRS S1', 'IFRS S2', 'MSX', 'China ESG Pack', 'TCFD'].map((pack) => (
              <button
                key={pack}
                onClick={() => {
                  const isActive = period.packs.includes(pack);
                  setPeriod({
                    ...period,
                    packs: isActive
                      ? period.packs.filter((p) => p !== pack)
                      : [...period.packs, pack],
                  });
                }}
                className={clsx(
                  'px-4 py-3 rounded-xl font-medium border transition-all text-left',
                  period.packs.includes(pack)
                    ? 'bg-accent/10 text-accent border-accent'
                    : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
                )}
              >
                {pack}
              </button>
            ))}
          </div>
          <div className="mt-4 p-4 bg-dark-bg border border-dark-border rounded-xl">
            <p className="text-xs text-gray-400">
              ✓ Auto-generates disclosure checklist + required evidence rules per pack selected
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Review & Create */}
      {step === 4 && (
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-white">Review & Create</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Period Name:</span>
              <span className="text-white font-medium">{period.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Date Range:</span>
              <span className="text-white font-medium">
                {period.startDate} to {period.endDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Boundary:</span>
              <span className="text-white font-medium">{period.boundary}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Region Mode:</span>
              <span className="text-white font-medium">{period.regionMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Framework Packs:</span>
              <span className="text-white font-medium">{period.packs.join(', ')}</span>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-xl">
            <p className="text-sm text-white font-medium mb-1">Ready to Create</p>
            <p className="text-xs text-gray-400">
              This will generate your Period Workspace with disclosure checklist, evidence rules, and DMA setup
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-6 py-3 rounded-xl font-medium border border-dark-border text-gray-400 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Back
        </button>
        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="px-6 py-3 rounded-xl font-medium bg-accent text-dark-bg hover:bg-accent/90 flex items-center gap-2 transition-all"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            className="px-6 py-3 rounded-xl font-medium bg-accent text-dark-bg hover:bg-accent/90 flex items-center gap-2 transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            Create Period Workspace
          </button>
        )}
      </div>
    </div>
  );
}

