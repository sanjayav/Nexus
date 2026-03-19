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
    navigate('/executive');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black tracking-tight">Create Reporting Period</h1>
        <p className="text-sm text-black/60 font-medium mt-2 max-w-2xl tracking-wide">
          Set up a new reporting cycle with framework packs, scope boundary, and disclosure checklist.
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
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all shadow-sm',
                  step >= s.num
                    ? 'bg-black text-white border-black'
                    : 'bg-white/60 text-black/40 border-black/10'
                )}
              >
                {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
              </div>
              <span
                className={clsx(
                  'text-xs mt-3 font-bold uppercase tracking-widest',
                  step >= s.num ? 'text-black' : 'text-black/40'
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < 3 && (
              <div
                className={clsx(
                  'flex-1 h-0.5 mx-4 transition-all rounded-full',
                  step > s.num ? 'bg-black' : 'bg-black/10'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Period Details */}
      {step === 1 && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-black/5 rounded-xl border border-black/5">
              <Calendar className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-xl font-bold text-black">Period Details</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Period Name</label>
              <input
                type="text"
                value={period.name}
                onChange={(e) => setPeriod({ ...period, name: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl text-black font-semibold focus:border-black focus:outline-none shadow-sm transition-colors"
                placeholder="e.g., FY2025"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">Start Date</label>
                <input
                  type="date"
                  value={period.startDate}
                  onChange={(e) => setPeriod({ ...period, startDate: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl text-black font-semibold focus:border-black focus:outline-none shadow-sm transition-colors appearance-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-2">End Date</label>
                <input
                  type="date"
                  value={period.endDate}
                  onChange={(e) => setPeriod({ ...period, endDate: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl text-black font-semibold focus:border-black focus:outline-none shadow-sm transition-colors appearance-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Scope & Region */}
      {step === 2 && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-black/5 rounded-xl border border-black/5">
              <Globe className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-xl font-bold text-black">Scope Boundary & Region</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-3">Scope Boundary</label>
              <div className="flex flex-wrap gap-3">
                {['Group', 'BU', 'Site', 'Asset'].map((b) => (
                  <button
                    key={b}
                    onClick={() => setPeriod({ ...period, boundary: b })}
                    className={clsx(
                      'px-6 py-3 rounded-xl text-sm font-bold border transition-all shadow-sm',
                      period.boundary === b
                        ? 'bg-black text-white border-black'
                        : 'bg-white border-black/10 text-black/70 hover:border-black/30'
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-black/60 uppercase tracking-widest mb-3">Region Mode</label>
              <div className="flex flex-wrap gap-3">
                {['Global', 'India', 'GCC', 'China', 'India + Global', 'GCC + Global', 'Global + China'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setPeriod({ ...period, regionMode: r })}
                    className={clsx(
                      'px-6 py-3 rounded-xl text-sm font-bold border transition-all shadow-sm',
                      period.regionMode === r
                        ? 'bg-[#12C87A]/10 text-[#013328] border-[#12C87A]/30'
                        : 'bg-white border-black/10 text-black/70 hover:border-black/30'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Framework Packs */}
      {step === 3 && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-black/5 rounded-xl border border-black/5">
              <FileText className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-xl font-bold text-black">Select Framework Packs</h2>
          </div>
          <p className="text-sm font-medium text-black/60 mb-6">
            Choose which disclosure frameworks are required for this reporting period.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {['GRI', 'IFRS S1', 'IFRS S2', 'MSX', 'BRSR Core', 'China ESG Pack', 'TCFD'].map((pack) => (
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
                  'px-4 py-4 rounded-xl text-sm font-bold border transition-all shadow-sm text-left',
                  period.packs.includes(pack)
                    ? 'bg-black text-white border-black shadow-md scale-[1.02]'
                    : 'bg-white border-black/10 text-black/70 hover:border-black/30 hover:scale-[1.01]'
                )}
              >
                {pack}
              </button>
            ))}
          </div>
          <div className="mt-6 p-4 bg-[#12C87A]/5 border border-[#12C87A]/20 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[#12C87A] shrink-0" />
            <p className="text-xs font-bold text-[#013328]">
              Auto-generates disclosure checklist + required evidence rules per pack selected.
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Review & Create */}
      {step === 4 && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-black/5 rounded-xl border border-black/5">
              <CheckCircle className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-xl font-bold text-black">Review & Create</h2>
          </div>

          <div className="grid gap-4 bg-white border border-black/10 rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex justify-between items-center py-2 border-b border-black/5">
              <span className="text-xs font-bold text-black/50 uppercase tracking-widest">Period Name</span>
              <span className="text-sm font-bold text-black">{period.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-black/5">
              <span className="text-xs font-bold text-black/50 uppercase tracking-widest">Date Range</span>
              <span className="text-sm font-bold text-black">
                {period.startDate} <span className="text-black/40 mx-1">to</span> {period.endDate}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-black/5">
              <span className="text-xs font-bold text-black/50 uppercase tracking-widest">Boundary</span>
              <span className="text-sm font-bold text-black">{period.boundary}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-black/5">
              <span className="text-xs font-bold text-black/50 uppercase tracking-widest">Region Mode</span>
              <span className="text-sm font-bold text-black">{period.regionMode}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs font-bold text-black/50 uppercase tracking-widest">Framework Packs</span>
              <span className="text-sm font-bold text-[#12C87A] bg-[#12C87A]/10 px-2 py-0.5 rounded">{period.packs.join(', ')}</span>
            </div>
          </div>

          <div className="p-4 bg-black border border-black rounded-xl text-white shadow-lg">
            <p className="text-sm font-bold mb-1">Ready to Create</p>
            <p className="text-xs text-white/60 font-medium">
              This will generate your Period Workspace with disclosure checklist, evidence rules, and DMA setup.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-6 py-3 rounded-xl text-xs uppercase tracking-widest font-bold border border-black/10 bg-white text-black/60 hover:text-black hover:border-black/30 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Back
        </button>
        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="px-6 py-3 rounded-xl text-xs uppercase tracking-widest font-bold bg-black text-white shadow-lg hover:bg-black/80 hover:scale-[1.02] flex items-center gap-2 transition-all"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            className="px-6 py-3 rounded-xl text-xs uppercase tracking-widest font-bold bg-[#12C87A] text-[#013328] shadow-lg shadow-[#12C87A]/20 hover:scale-[1.02] flex items-center gap-2 transition-all border border-[#12C87A]/50"
          >
            <CheckCircle className="w-4 h-4" />
            Create Period Workspace
          </button>
        )}
      </div>
    </div>
  );
}

