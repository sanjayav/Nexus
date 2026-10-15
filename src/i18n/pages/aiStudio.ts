import { defineStrings } from '..'

export const aiStudioStrings = defineStrings({
  en: {
    title: 'AI Studio',
    description: 'AI-powered drafting, data extraction and disclosure mapping for ESG reporting.',
    draftTitle: 'AI drafting',
    draftDesc: 'Generate disclosure narratives from your data. Describe a section and let AI draft the text.',
    promptLabel: 'What should we draft?',
    placeholder: 'e.g. Describe our Scope 1+2 emissions reduction strategy and targets…',
    generate: 'Generate draft',
    capabilities: 'Capabilities',
    statusLabel: { beta: 'Beta', coming: 'Coming soon' },
    features: {
      draft: { name: 'AI drafting', desc: 'Generate narrative disclosures from data. ESRS, GRI, BRSR aligned.' },
      extract: { name: 'Data extraction', desc: 'Extract metrics from PDFs and spreadsheets. Auto-map to disclosures.' },
      map: { name: 'Disclosure mapping', desc: 'AI-suggested mapping across frameworks. Reduce duplicate entry.' },
      chat: { name: 'ESG assistant', desc: 'Ask questions about your data, e.g. "What is our Scope 3 trend?"' },
    },
  },
  zh: {
    title: 'AI 工作室',
    description: '借助 AI 完成 ESG 报告的文本起草、数据提取与披露映射。',
    draftTitle: 'AI 起草',
    draftDesc: '基于您的数据生成披露叙述。描述所需章节，由 AI 起草文本。',
    promptLabel: '需要起草什么内容？',
    placeholder: '例如：描述我们的范围一和范围二减排策略及目标……',
    generate: '生成草稿',
    capabilities: '功能',
    statusLabel: { beta: '测试版', coming: '即将推出' },
    features: {
      draft: { name: 'AI 起草', desc: '基于数据生成叙述性披露，符合 ESRS、GRI、BRSR 要求。' },
      extract: { name: '数据提取', desc: '从 PDF 和电子表格中提取指标，并自动映射至披露项。' },
      map: { name: '披露映射', desc: 'AI 建议的跨框架映射，减少重复录入。' },
      chat: { name: 'ESG 助手', desc: '就您的数据提问，例如“我们的范围三排放趋势如何？”' },
    },
  },
})
