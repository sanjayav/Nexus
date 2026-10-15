import { defineStrings } from '..'

export const executiveOverviewStrings = defineStrings({
  en: {
    title: 'Command center',
    description: "You're on track. Close the remaining gaps to publish the {period} pack.",
    period: 'FY2025',
    region: 'Global + China',
    integrityVerified: 'Integrity verified',
    resolveGaps: 'Resolve gaps',

    kpi: {
      dma: 'DMA completion',
      dmaDelta: 'vs last month',
      coverage: 'Framework coverage',
      coverageFoot: 'Average across {count} frameworks',
      integrity: 'Integrity score',
      integrityFoot: 'Anchored data and approvals',
      emissions: 'Scope 1 + 2 emissions',
      emissionsFoot: 'Market-based, reporting period to date',
    },

    pipeline: {
      title: 'Reporting pipeline',
      description: '{done} of {total} material topics have a completed DMA',
      stages: { setup: 'Setup', dma: 'DMA', collection: 'Collection', review: 'Review', publish: 'Publish' },
      done: 'Done',
      current: 'In progress',
      upcoming: 'Upcoming',
      blocking: '{count} blocking issues',
      noBlocking: 'No blocking issues',
      openWorkbench: 'Open workbench',
      trend: 'DMA completion trend',
      trendDelta: '+{pct} this month',
    },

    risk: {
      title: 'Risks and next actions',
      description: 'What stands between you and publishing',
      critical: 'Critical gaps',
      missingEvidence: 'Missing evidence',
      expiringTargets: 'Expiring targets',
      alertsTitle: 'Latest alerts',
      levels: { error: 'Blocking', warning: 'Warning', info: 'Info' },
      alerts: {
        '1': 'GRI index CID missing',
        '2': '3 items over SLA in review',
        '3': 'IPFS replica drift detected',
      } as Record<string, string>,
    },

    features: {
      title: 'Workspace',
      description: 'Four ways to move your reporting forward',
      open: 'Open',
      ai: 'AI',
      items: {
        collect: { title: 'Collect', desc: 'Select metrics, invite contributors and track the progress of data requests.' },
        comply: { title: 'Comply', desc: 'Stay aligned with the latest ESG regulations and frameworks as they evolve.' },
        report: { title: 'Report', desc: 'Measure, analyse and report ESG performance from one central platform.' },
        improve: { title: 'Improve', desc: 'Set targets and action plans to improve your ESG performance.' },
      },
    },

    frameworks: { title: 'Framework coverage', description: 'Share of applicable disclosures covered' },

    ghg: {
      title: 'GHG snapshot',
      description: 'Current reporting period',
      scope1: 'Scope 1',
      scope2Loc: 'Scope 2 (location)',
      scope2Mkt: 'Scope 2 (market)',
      calculateRoots: 'Calculate roots',
    },

    trust: {
      title: 'Trust layer',
      description: 'Composite integrity index',
      outOf: '/ 100',
      anchored: 'Anchored completeness',
      approvals: 'Approvals passed',
      validations: 'Zero failed validations',
      active: 'Web3 integrity active',
    },

    rollup: {
      title: 'Period roll-up',
      description: 'Merkle root anchored on-chain',
      root: 'Blockchain root',
      chain: 'Network',
      viewExplorer: 'View on zkEVM explorer',
    },

    approvals: {
      title: 'Approvals funnel',
      description: 'Data submissions by workflow stage',
      files: '{count} files',
      avg: 'avg {time}',
      stages: { Submitted: 'Submitted', 'In Review': 'In review', Approved: 'Approved', Published: 'Published' } as Record<string, string>,
    },

    coverage: { title: 'Coverage by module', description: 'Percentage of required data points covered', series: 'Covered' },

    help: {
      title: 'Help and shortcuts',
      quickLinks: 'Quick links',
      links: {
        csrd: 'How does Nexus support CSRD / BRSR compliance?',
        edci: 'How can I submit EDCI and GHG data?',
        targets: 'How can I set targets and action plans?',
        scope3: 'Scope 3 calculator and supply chain',
      },
      pioneer: 'Pioneer features',
      pioneerLinks: { scope3: 'Scope 3 calculator', ai: 'AI Studio', workflow: 'Workflow config', xbrl: 'XBRL export' },
    },
  },
  zh: {
    title: '指挥中心',
    description: '进展顺利。补齐剩余差距即可发布 {period} 报告包。',
    period: 'FY2025',
    region: '全球 + 中国',
    integrityVerified: '完整性已验证',
    resolveGaps: '处理差距',

    kpi: {
      dma: '双重重要性评估完成度',
      dmaDelta: '较上月',
      coverage: '框架覆盖率',
      coverageFoot: '{count} 个框架的平均值',
      integrity: '完整性评分',
      integrityFoot: '已锚定数据与审批',
      emissions: '范围一 + 范围二排放',
      emissionsFoot: '基于市场法，报告期累计',
    },

    pipeline: {
      title: '报告流程',
      description: '{total} 个重要性议题中已有 {done} 个完成双重重要性评估',
      stages: { setup: '设置', dma: 'DMA', collection: '数据采集', review: '审核', publish: '发布' },
      done: '已完成',
      current: '进行中',
      upcoming: '待开始',
      blocking: '{count} 个阻塞问题',
      noBlocking: '无阻塞问题',
      openWorkbench: '打开工作台',
      trend: '双重重要性评估完成度趋势',
      trendDelta: '本月 +{pct}',
    },

    risk: {
      title: '风险与后续行动',
      description: '发布前仍需解决的事项',
      critical: '关键差距',
      missingEvidence: '缺失证据',
      expiringTargets: '即将到期的目标',
      alertsTitle: '最新提醒',
      levels: { error: '阻塞', warning: '警告', info: '提示' },
      alerts: {
        '1': 'GRI 索引 CID 缺失',
        '2': '3 项审核超出 SLA',
        '3': '检测到 IPFS 副本偏差',
      },
    },

    features: {
      title: '工作区',
      description: '推进报告工作的四种方式',
      open: '打开',
      ai: 'AI',
      items: {
        collect: { title: '采集', desc: '选择指标、邀请填报人，并跟踪数据请求进度。' },
        comply: { title: '合规', desc: '紧跟不断更新的 ESG 法规与披露框架。' },
        report: { title: '报告', desc: '在统一平台上衡量、分析并报告 ESG 绩效。' },
        improve: { title: '改进', desc: '设定目标与行动计划，持续提升 ESG 绩效。' },
      },
    },

    frameworks: { title: '框架覆盖率', description: '已覆盖的适用披露项占比' },

    ghg: {
      title: '温室气体概览',
      description: '当前报告期',
      scope1: '范围一',
      scope2Loc: '范围二（基于位置）',
      scope2Mkt: '范围二（基于市场）',
      calculateRoots: '计算根哈希',
    },

    trust: {
      title: '可信层',
      description: '综合完整性指数',
      outOf: '/ 100',
      anchored: '锚定完整度',
      approvals: '审批通过率',
      validations: '零校验失败',
      active: 'Web3 完整性校验已启用',
    },

    rollup: {
      title: '报告期汇总',
      description: 'Merkle 根已上链锚定',
      root: '区块链根哈希',
      chain: '网络',
      viewExplorer: '在 zkEVM 浏览器中查看',
    },

    approvals: {
      title: '审批漏斗',
      description: '按流程阶段统计的数据提交',
      files: '{count} 个文件',
      avg: '平均 {time}',
      stages: { Submitted: '已提交', 'In Review': '审核中', Approved: '已批准', Published: '已发布' },
    },

    coverage: { title: '各模块覆盖率', description: '所需数据点的覆盖百分比', series: '已覆盖' },

    help: {
      title: '帮助与快捷入口',
      quickLinks: '常见问题',
      links: {
        csrd: 'Nexus 如何支持 CSRD / BRSR 合规？',
        edci: '如何提交 EDCI 与温室气体数据？',
        targets: '如何设定目标与行动计划？',
        scope3: '范围三计算器与供应链',
      },
      pioneer: '先锋功能',
      pioneerLinks: { scope3: '范围三计算器', ai: 'AI 工作室', workflow: '流程配置', xbrl: 'XBRL 导出' },
    },
  },
})
