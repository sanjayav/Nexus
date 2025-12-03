import { useState } from 'react';
import { Globe, Database, Languages, Building2, Users, FileText, Calculator, Save, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export default function OrganizationSetup() {
  const [config, setConfig] = useState({
    regionMode: 'Global',
    dataResidency: 'Global',
    defaultLanguage: 'EN',
    entityHierarchy: ['Group', 'BU', 'Site', 'Asset'],
    frameworkPacks: ['GRI', 'IFRS S1', 'IFRS S2'],
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In real app: POST to backend
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Organization Setup</h1>
          <p className="text-gray-400 mt-2">Configure your reporting environment, frameworks, and governance model</p>
        </div>
        <button
          onClick={handleSave}
          className={clsx(
            'px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all',
            saved
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
              : 'bg-accent text-dark-bg hover:bg-accent/90'
          )}
        >
          {saved ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Configuration
            </>
          )}
        </button>
      </div>

      {/* Region Mode */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Globe className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-white">Region Mode</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Determines disclosure requirements, language, evidence rules, and benchmarking peer sets
        </p>
        <div className="flex gap-3">
          {['Global', 'China', 'Global + China'].map((mode) => (
            <button
              key={mode}
              onClick={() => setConfig({ ...config, regionMode: mode })}
              className={clsx(
                'px-6 py-3 rounded-xl font-medium border transition-all',
                config.regionMode === mode
                  ? 'bg-accent/10 text-accent border-accent'
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Data Residency */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Data Residency</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">Storage and integrity proof deployment location</p>
        <div className="flex gap-3">
          {['CN-only', 'Global', 'Hybrid'].map((residency) => (
            <button
              key={residency}
              onClick={() => setConfig({ ...config, dataResidency: residency })}
              className={clsx(
                'px-6 py-3 rounded-xl font-medium border transition-all',
                config.dataResidency === residency
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/50'
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
              )}
            >
              {residency}
            </button>
          ))}
        </div>
      </div>

      {/* Default Language */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Languages className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Default Language</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">UI, guidance, and report outputs default language</p>
        <div className="flex gap-3">
          {[
            { code: 'EN', label: 'English' },
            { code: '简体中文', label: '简体中文' },
            { code: 'عربي', label: 'عربي' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => setConfig({ ...config, defaultLanguage: lang.code })}
              className={clsx(
                'px-6 py-3 rounded-xl font-medium border transition-all',
                config.defaultLanguage === lang.code
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/50'
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entity Hierarchy */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Building2 className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Entity Hierarchy</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Organizational structure for rollup, gap analysis, and approval chains
        </p>
        <div className="flex items-center gap-2 text-gray-300">
          {config.entityHierarchy.map((level, idx) => (
            <div key={level} className="flex items-center gap-2">
              <span className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg font-medium">
                {level}
              </span>
              {idx < config.entityHierarchy.length - 1 && <span className="text-gray-600">→</span>}
            </div>
          ))}
        </div>
        <button className="mt-4 text-sm text-accent hover:underline">+ Add custom level</button>
      </div>

      {/* Roles (RBAC) */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Roles (RBAC)</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">Access control and approval permissions</p>
        <div className="grid grid-cols-5 gap-3">
          {['Contributor', 'Reviewer', 'Approver', 'Auditor', 'Admin'].map((role) => (
            <div
              key={role}
              className="px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-center"
            >
              <div className="text-sm font-medium text-white">{role}</div>
            </div>
          ))}
        </div>
        <button className="mt-4 text-sm text-accent hover:underline">Configure role permissions</button>
      </div>

      {/* Framework Packs */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Framework Packs Enabled</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Active disclosure frameworks available for reporting periods
        </p>
        <div className="grid grid-cols-3 gap-3">
          {['GRI', 'IFRS S1', 'IFRS S2', 'MSX', 'China ESG Pack', 'TCFD'].map((pack) => (
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
                'px-4 py-3 rounded-xl font-medium border transition-all text-left',
                config.frameworkPacks.includes(pack)
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/50'
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
              )}
            >
              {pack}
            </button>
          ))}
        </div>
      </div>

      {/* Method Libraries */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Calculator className="w-5 h-5 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Method Libraries</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Unit conversions, emission factors, boundary rules, and calculation standards
        </p>
        <div className="space-y-3">
          {[
            { name: 'Unit Conversion Library', status: 'Active', count: '248 units' },
            { name: 'Emission Factor Database', status: 'Active', count: '1,842 factors (IPCC 2021)' },
            { name: 'Boundary & Consolidation Rules', status: 'Active', count: 'GHG Protocol + GRI' },
          ].map((lib) => (
            <div
              key={lib.name}
              className="flex items-center justify-between p-4 bg-dark-bg border border-dark-border rounded-xl"
            >
              <div>
                <div className="text-sm font-medium text-white">{lib.name}</div>
                <div className="text-xs text-gray-400 mt-1">{lib.count}</div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-medium">
                {lib.status}
              </span>
            </div>
          ))}
        </div>
        <button className="mt-4 text-sm text-accent hover:underline">Manage method libraries</button>
      </div>

      {/* Output Summary */}
      <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">Configuration Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Region Mode:</span>{' '}
            <span className="text-white font-medium">{config.regionMode}</span>
          </div>
          <div>
            <span className="text-gray-400">Data Residency:</span>{' '}
            <span className="text-white font-medium">{config.dataResidency}</span>
          </div>
          <div>
            <span className="text-gray-400">Default Language:</span>{' '}
            <span className="text-white font-medium">{config.defaultLanguage}</span>
          </div>
          <div>
            <span className="text-gray-400">Framework Packs:</span>{' '}
            <span className="text-white font-medium">{config.frameworkPacks.join(', ')}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          ✓ Changes saved will apply to all new reporting periods created after this point.
        </p>
      </div>
    </div>
  );
}

