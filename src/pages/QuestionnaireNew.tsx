import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  CheckCircle,
  AlertCircle,
  Link2,
  FileText,
  Table,
  BarChart3,
  History,
  ChevronLeft,
  Calendar,
  User,
  Upload,
} from 'lucide-react';
import { mockData } from '../data/mockData';
import clsx from 'clsx';

type Tab = 'form' | 'breakdown' | 'evidence' | 'kpi' | 'history';

export default function QuestionnaireNew() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  console.log('🔍 QuestionnaireNew rendering', { moduleId });

  const module = useMemo(
    () => {
      const found = mockData.modules.find((m) => m.id === moduleId);
      console.log('📦 Module lookup', { moduleId, found: found?.title || 'NOT FOUND', allModules: mockData.modules.map(m => m.id) });
      return found;
    },
    [moduleId]
  );

  const sections = useMemo(
    () => {
      if (!moduleId) {
        console.log('⚠️ No moduleId provided');
        return [];
      }
      const filtered = mockData.questionnaireSections.filter((s) => s.module === moduleId);
      console.log('📋 Sections lookup', { moduleId, count: filtered.length, totalSections: mockData.questionnaireSections.length });
      return filtered;
    },
    [moduleId]
  );

  const [activeSectionId, setActiveSectionId] = useState<string>('');

  // Update activeSectionId when sections load or moduleId changes
  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  const currentSection = useMemo(
    () => {
      if (sections.length === 0) return null;
      if (!activeSectionId) return sections[0];
      return sections.find((s) => s.id === activeSectionId) || sections[0];
    },
    [sections, activeSectionId]
  );

  // Early return if no module
  if (!module) {
    console.log('❌ Module not found, showing error');
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-dark-bg">
        <div className="text-center max-w-md p-8 bg-dark-surface rounded-xl border border-dark-border">
          <h1 className="text-2xl font-bold text-white mb-4">Module Not Found</h1>
          <p className="text-gray-400 mb-2">Module ID: <span className="font-mono text-accent">{moduleId || 'undefined'}</span></p>
          <p className="text-sm text-gray-500 mb-6">
            Available modules: {mockData.modules.map(m => m.id).join(', ')}
          </p>
          <button
            onClick={() => navigate('/modules')}
            className="px-6 py-3 bg-accent text-dark-bg rounded-xl hover:bg-accent/90 font-medium"
          >
            Back to Modules
          </button>
        </div>
      </div>
    );
  }

  // Early return if no sections
  if (sections.length === 0) {
    console.log('❌ No sections found, showing error');
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-dark-bg">
        <div className="text-center max-w-md p-8 bg-dark-surface rounded-xl border border-dark-border">
          <h2 className="text-xl font-bold text-white mb-4">No Questionnaire Sections Found</h2>
          <p className="text-gray-400 mb-2">Module ID: <span className="font-mono text-accent">{moduleId}</span></p>
          <p className="text-sm text-gray-500 mb-6">
            Total sections in data: {mockData.questionnaireSections.length}
            <br />
            Sections for this module: {mockData.questionnaireSections.filter(s => s.module === moduleId).length}
          </p>
          <button
            onClick={() => navigate(`/modules/${moduleId}`)}
            className="px-4 py-2 bg-accent text-dark-bg rounded-xl hover:bg-accent/90 font-medium"
          >
            Back to {module.title}
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!currentSection) {
    console.log('⏳ No current section, showing loading');
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-dark-bg">
        <div className="text-center p-8 bg-dark-surface rounded-xl border border-dark-border">
          <p className="text-gray-400 mb-2">Loading section...</p>
          <p className="text-xs text-gray-500">Sections: {sections.length}, Active ID: {activeSectionId || 'none'}</p>
        </div>
      </div>
    );
  }

  console.log('✅ Rendering questionnaire UI', {
    module: module.title,
    sectionsCount: sections.length,
    currentSection: currentSection.title,
    fieldsCount: (currentSection.fields || []).length
  });

  const meta = (currentSection.meta || {}) as any;
  const fields = (currentSection.fields || []) as any[];

  // Ensure we have data
  if (!currentSection || !fields) {
    console.error('❌ Missing currentSection or fields', { currentSection, fields });
    return (
      <div className="w-full bg-red-500/10 border border-red-500 p-8 rounded-xl">
        <h1 className="text-white text-xl font-bold mb-2">Error: Missing Data</h1>
        <p className="text-gray-300">currentSection: {currentSection ? 'exists' : 'null'}</p>
        <p className="text-gray-300">fields: {fields ? fields.length : 'null'}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'form' as const, label: 'Answers', icon: FileText, subtitle: 'Required answers' },
    { id: 'breakdown' as const, label: 'Breakdown', icon: Table, subtitle: 'Sub-values' },
    { id: 'evidence' as const, label: 'Evidence', icon: Link2, subtitle: 'Attachments' },
    { id: 'kpi' as const, label: 'KPI / KRI', icon: BarChart3, subtitle: 'Performance' },
    { id: 'history' as const, label: 'Audit Trail', icon: History, subtitle: 'Traceability' },
  ];

  const handleSave = () => {
    // Save logic here
    console.log('Saved:', formValues);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8">
      {/* Left Sidebar - Section Navigator */}
      <div className="w-80 bg-dark-surface border-r border-dark-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-dark-border">
          <button
            onClick={() => navigate(`/modules/${moduleId}`)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to {module.title}
          </button>
          <h2 className="text-lg font-bold text-white">Disclosures</h2>
          <p className="text-xs text-gray-400 mt-1">{sections.length} sections</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sections.map((section) => {
            const sectionMeta = section.meta || {} as any;
            const completion = (sectionMeta as any).completion || { required: 0, answered: 0 };
            const completionPercent = completion.required > 0
              ? Math.round((completion.answered / completion.required) * 100)
              : 0;

            return (
              <button
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className={clsx(
                  'w-full text-left p-3 rounded-xl mb-2 transition-all',
                  activeSectionId === section.id
                    ? 'bg-accent/10 border border-accent/40'
                    : 'hover:bg-dark-bg border border-transparent'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className={clsx(
                    'text-sm font-medium',
                    activeSectionId === section.id ? 'text-accent' : 'text-white'
                  )}>
                    {section.title}
                  </h3>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0',
                      (sectionMeta as any).status === 'Approved'
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : (sectionMeta as any).status === 'In Review'
                          ? 'bg-blue-500/10 text-blue-300'
                          : 'bg-gray-500/10 text-gray-400'
                    )}
                  >
                    {(sectionMeta as any).status || 'Draft'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-dark-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{completionPercent}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-dark-bg overflow-hidden">
        {/* Fixed Header */}
        <div className="sticky top-0 z-30 bg-dark-bg border-b border-dark-border w-full">
          <div className="max-w-6xl mx-auto px-6 py-4">
            {/* Header Info */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{currentSection?.title || 'Select a disclosure section'}</h1>
                  <span
                    className={clsx(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      meta?.status === 'Approved'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                        : meta?.status === 'In Review'
                          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/40'
                          : 'bg-gray-500/10 text-gray-300 border border-gray-500/40'
                    )}
                  >
                    {meta?.status || 'Draft'}
                  </span>
                </div>

                {/* Meta Info Row */}
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{meta.owner || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {meta.dueDate || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Completion: {meta.completion?.required > 0 ? Math.round((meta.completion.answered / meta.completion.required) * 100) : 0}%</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-dark-surface border border-dark-border text-white rounded-xl hover:bg-dark-bg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-accent text-dark-bg rounded-xl font-medium hover:bg-accent/90 transition-colors">
                  <CheckCircle className="w-4 h-4" />
                  Request Review
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 transition-all whitespace-nowrap',
                      activeTab === tab.id
                        ? 'bg-dark-surface border-accent text-accent'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-dark-surface/50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{tab.label}</div>
                      <div className="text-xs opacity-70">{tab.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'form' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {fields.length === 0 ? (
                  <div className="bg-dark-surface border border-dark-border rounded-xl p-8 text-center">
                    <p className="text-gray-400 mb-2">No fields found for this section</p>
                    <p className="text-sm text-gray-500">Section: {currentSection?.title}</p>
                  </div>
                ) : (
                  fields.map((field) => (
                    <div
                      key={field.id}
                      className="bg-dark-surface border border-dark-border rounded-xl p-6 hover:border-accent/30 transition-colors"
                    >
                      {/* Field Label */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-white mb-1">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          {(field as any).hint && (
                            <p className="text-xs text-gray-400 mt-1">{(field as any).hint}</p>
                          )}
                        </div>
                        {(field as any).evidenceRequired && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full text-xs">
                            <Link2 className="w-3 h-3" />
                            Evidence required
                          </span>
                        )}
                      </div>

                      {/* Input Field */}
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formValues[field.id] || field.value || ''}
                          onChange={(e) =>
                            setFormValues({ ...formValues, [field.id]: e.target.value })
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          rows={6}
                          className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={formValues[field.id] || field.value || ''}
                          onChange={(e) =>
                            setFormValues({ ...formValues, [field.id]: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          {((field as any).options || []).map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formValues[field.id] || field.value || ''}
                          onChange={(e) =>
                            setFormValues({ ...formValues, [field.id]: e.target.value })
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                      )}

                      {/* Field Footer - Evidence Link */}
                      {(field as any).evidenceRequired && (
                        <button className="flex items-center gap-2 mt-3 text-sm text-accent hover:underline">
                          <Upload className="w-4 h-4" />
                          Link evidence file
                        </button>
                      )}
                    </div>
                  ))
                )}

                {/* Guidance Box */}
                <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20 rounded-xl p-6 mt-8">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-400" />
                    Guidance
                  </h3>
                  <div className="space-y-3 text-sm text-gray-300">
                    <div>
                      <p className="font-medium text-white mb-1">What Auditors Check:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
                        <li>Confirm boundary and ownership match DMA</li>
                        <li>Ensure evidence is anchored or pending review</li>
                        <li>Validate units and conversion factors</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-white mb-1">Common Mistakes:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
                        <li>Leaving evidence placeholders empty</li>
                        <li>Mixing Scope 1 & 2 responses</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-white mb-1">Example Answer:</p>
                      <p className="text-xs text-gray-400 italic">
                        Document protocol, factor source, period, and activity data per line item.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'breakdown' && (
              <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Breakdown Table</h3>
                <p className="text-sm text-gray-400">
                  Breakdown tables with auto-calculated totals will appear here for quantitative disclosures.
                </p>
              </div>
            )}

            {activeTab === 'evidence' && (
              <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Linked Evidence</h3>
                <p className="text-sm text-gray-400">Evidence files linked to this disclosure will appear here.</p>
              </div>
            )}

            {activeTab === 'kpi' && (
              <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">KPI / KRI Dashboard</h3>
                <p className="text-sm text-gray-400">
                  Performance indicators and data quality risk indicators will appear here.
                </p>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Audit Trail</h3>
                <p className="text-sm text-gray-400">Version history and approval trail will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

