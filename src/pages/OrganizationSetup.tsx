import { useState } from 'react';
import { Globe, Database, Languages, Building2, Users, FileText, Calculator, Save, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export default function OrganizationSetup() {
  const [config, setConfig] = useState({
    regionMode: 'Global',
    dataResidency: 'Global',
    defaultLanguage: 'EN',
    defaultCurrency: 'USD',
    entityHierarchy: ['Group', 'BU', 'Site', 'Asset'],
    frameworkPacks: ['GRI', 'IFRS S1', 'IFRS S2'],
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight">Organization Setup</h1>
          <p className="text-sm font-medium text-black/60 mt-2 tracking-wide">Configure your reporting environment, frameworks, and governance model.</p>
        </div>
        <button
          onClick={handleSave}
          className={clsx(
            'px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg',
            saved
              ? 'bg-[#12C87A] text-[#013328] shadow-[#12C87A]/20 scale-[1.02]'
              : 'bg-black text-white hover:scale-[1.02] hover:shadow-black/20'
          )}
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Configuration
            </>
          )}
        </button>
      </div>

      {/* Region Mode */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-black/5 rounded-xl border border-black/5">
            <Globe className="w-5 h-5 text-black" />
          </div>
          <h2 className="text-xl font-bold text-black">Region Mode</h2>
        </div>
        <p className="text-sm text-black/50 font-medium mb-6">
          Determines disclosure requirements, language, evidence rules, and benchmarking peer sets.
        </p>
        <div className="flex flex-wrap gap-3">
          {['Global', 'India', 'GCC', 'China', 'India + Global', 'GCC + Global', 'Global + China'].map((mode) => (
            <button
              key={mode}
              onClick={() => setConfig({ ...config, regionMode: mode })}
              className={clsx(
                'px-6 py-3 rounded-xl text-sm font-bold border transition-all shadow-sm',
                config.regionMode === mode
                  ? 'bg-black text-white border-black scale-[1.02]'
                  : 'bg-white border-black/10 text-black/70 hover:border-black/30'
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Data Residency */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/10">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-black">Data Residency</h2>
        </div>
        <p className="text-sm text-black/50 font-medium mb-6">Storage and integrity proof deployment location.</p>
        <div className="flex flex-wrap gap-3">
          {['CN-only', 'Global', 'Hybrid'].map((residency) => (
            <button
              key={residency}
              onClick={() => setConfig({ ...config, dataResidency: residency })}
              className={clsx(
                'px-6 py-3 rounded-xl text-sm font-bold border transition-all shadow-sm',
                config.dataResidency === residency
                  ? 'bg-blue-600 text-white border-blue-600 scale-[1.02]'
                  : 'bg-white border-black/10 text-black/70 hover:border-black/30'
              )}
            >
              {residency}
            </button>
          ))}
        </div>
      </div>

      {/* Default Language */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/10">
            <Languages className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-black">Default Language</h2>
        </div>
        <p className="text-sm text-black/50 font-medium mb-6">UI, guidance, and report outputs default language.</p>
        <div className="flex flex-wrap gap-3">
          {[
            { code: 'EN', label: 'English' },
            { code: 'हिंदी', label: 'हिंदी' },
            { code: '简体中文', label: '简体中文' },
            { code: 'عربي', label: 'عربي' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => setConfig({ ...config, defaultLanguage: lang.code })}
              className={clsx(
                'px-6 py-3 rounded-xl text-sm font-bold border transition-all shadow-sm',
                config.defaultLanguage === lang.code
                  ? 'bg-purple-600 text-white border-purple-600 scale-[1.02]'
                  : 'bg-white border-black/10 text-black/70 hover:border-black/30'
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entity Hierarchy */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/10">
            <Building2 className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-black">Entity Hierarchy</h2>
        </div>
        <p className="text-sm text-black/50 font-medium mb-6">
          Organizational structure for rollup, gap analysis, and approval chains.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-black/30">
          {config.entityHierarchy.map((level, idx) => (
            <div key={level} className="flex items-center gap-3">
              <span className="px-6 py-3 bg-white border border-black/10 rounded-xl font-bold text-black shadow-sm">
                {level}
              </span>
              {idx < config.entityHierarchy.length - 1 && <span className="font-bold">→</span>}
            </div>
          ))}
        </div>
        <button className="mt-6 text-xs uppercase tracking-widest font-bold text-black/60 hover:text-black transition-colors self-start">+ Add custom level</button>
      </div>

      {/* Default Currency */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/10">
            <Calculator className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-black">Default Currency</h2>
        </div>
        <p className="text-sm text-black/50 font-medium mb-6">Financial metrics, BRSR, and report outputs.</p>
        <div className="flex flex-wrap gap-3">
          {[
            { code: 'USD', label: 'USD ($)' },
            { code: 'INR', label: 'INR (₹)' },
            { code: 'OMR', label: 'OMR' },
            { code: 'AED', label: 'AED' },
            { code: 'SAR', label: 'SAR' },
          ].map((curr) => (
            <button
              key={curr.code}
              onClick={() => setConfig({ ...config, defaultCurrency: curr.code })}
              className={clsx(
                'px-6 py-3 rounded-xl text-sm font-bold border transition-all shadow-sm',
                config.defaultCurrency === curr.code
                  ? 'bg-emerald-600 text-white border-emerald-600 scale-[1.02]'
                  : 'bg-white border-black/10 text-black/70 hover:border-black/30'
              )}
            >
              {curr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roles (RBAC) */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#12C87A]/10 rounded-xl border border-[#12C87A]/10">
            <Users className="w-5 h-5 text-[#12C87A]" />
          </div>
          <h2 className="text-xl font-bold text-black">Roles (RBAC)</h2>
        </div>
        <p className="text-sm text-black/50 font-medium mb-6">Access control and approval permissions.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['Contributor', 'Reviewer', 'Approver', 'Auditor', 'Admin'].map((role) => (
            <div
              key={role}
              className="px-4 py-4 bg-white border border-black/10 rounded-xl text-center shadow-sm"
            >
              <div className="text-sm font-bold text-black">{role}</div>
            </div>
          ))}
        </div>
        <button className="mt-6 text-xs uppercase tracking-widest font-bold text-black/60 hover:text-black transition-colors self-start">Configure role permissions</button>
      </div>

      {/* Framework Packs */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/10">
            <FileText className="w-5 h-5 text-cyan-600" />
          </div>
          <h2 className="text-xl font-bold text-black">Framework Packs Enabled</h2>
        </div>
        <p className="text-sm text-black/50 font-medium mb-6">
          Active disclosure frameworks available for reporting periods.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {['GRI', 'IFRS S1', 'IFRS S2', 'MSX', 'BRSR Core', 'China ESG Pack', 'TCFD'].map((pack) => (
            <button
              key={pack}
              onClick={() => {
                const isActive = config.frameworkPacks.includes(pack);
                setConfig({
                  ...config,
                  frameworkPacks: isActive
                    ? config.frameworkPacks.filter((p) => p !== pack)
                    : [...config.frameworkPacks, pack],
                });
              }}
              className={clsx(
                'px-6 py-4 rounded-xl text-sm font-bold border transition-all text-left shadow-sm',
                config.frameworkPacks.includes(pack)
                  ? 'bg-cyan-600 text-white border-cyan-600 scale-[1.02]'
                  : 'bg-white border-black/10 text-black/70 hover:border-black/30'
              )}
            >
              {pack}
            </button>
          ))}
        </div>
      </div>

      {/* Method Libraries */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/10">
            <Calculator className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="text-xl font-bold text-black">Method Libraries</h2>
        </div>
        <p className="text-sm text-black/50 font-medium mb-6">
          Unit conversions, emission factors, boundary rules, and calculation standards.
        </p>
        <div className="space-y-4">
          {[
            { name: 'Unit Conversion Library', status: 'Active', count: '248 units' },
            { name: 'Emission Factor Database', status: 'Active', count: '1,842 factors (IPCC 2021)' },
            { name: 'Boundary & Consolidation Rules', status: 'Active', count: 'GHG Protocol + GRI' },
          ].map((lib) => (
            <div
              key={lib.name}
              className="flex items-center justify-between p-5 bg-white border border-black/10 rounded-2xl shadow-sm"
            >
              <div>
                <div className="text-sm font-bold text-black">{lib.name}</div>
                <div className="text-xs text-black/50 font-medium mt-1">{lib.count}</div>
              </div>
              <span className="px-3 py-1.5 bg-[#12C87A]/10 text-[#013328] border border-[#12C87A]/30 rounded-lg text-xs font-bold uppercase tracking-widest">
                {lib.status}
              </span>
            </div>
          ))}
        </div>
        <button className="mt-6 text-xs uppercase tracking-widest font-bold text-black/60 hover:text-black transition-colors self-start">Manage method libraries</button>
      </div>

      {/* Output Summary */}
      <div className="bg-black text-white rounded-[2rem] p-8 shadow-2xl flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        <h3 className="text-xl font-bold text-white mb-6 relative z-10">Configuration Summary</h3>
        <div className="grid grid-cols-2 gap-6 relative z-10">
          <div className="border-t border-white/10 pt-4">
            <span className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Region Mode</span>
            <span className="text-sm font-bold text-white">{config.regionMode}</span>
          </div>
          <div className="border-t border-white/10 pt-4">
            <span className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Data Residency</span>
            <span className="text-sm font-bold text-white">{config.dataResidency}</span>
          </div>
          <div className="border-t border-white/10 pt-4">
            <span className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Default Language</span>
            <span className="text-sm font-bold text-white">{config.defaultLanguage}</span>
          </div>
          <div className="border-t border-white/10 pt-4">
            <span className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Default Currency</span>
            <span className="text-sm font-bold text-white">{config.defaultCurrency}</span>
          </div>
          <div className="border-t border-white/10 pt-4">
            <span className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Framework Packs</span>
            <span className="text-sm font-bold text-white">{config.frameworkPacks.join(', ')}</span>
          </div>
        </div>
        <p className="text-xs font-medium text-white/50 mt-8 relative z-10 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#12C87A]" />
          Changes saved will apply to all newly created reporting periods.
        </p>
      </div>
    </div>
  );
}
