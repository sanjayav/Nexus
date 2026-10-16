/**
 * Mainland China connector catalogue — coming soon.
 *
 * These are catalogue entries only (status 'coming_soon'): they describe what
 * each integration will pull and how it will authenticate, so the Connectors
 * page can show the China roadmap, but none of them performs a live sync —
 * see ../comingSoon.ts. Field mappings are the planned mappings, documented
 * so customers can prepare equivalent CSV exports today.
 *
 * Kept out of CONNECTORS / listConnectors() / getConnector() in registry.ts so
 * no existing endpoint or UI path can start an OAuth flow or sync for them.
 */
import { comingSoonConnector } from '../comingSoon.js'

/** 金蝶云·星空 — ERP: fuel / energy purchases and utility expense vouchers. */
export const kingdeeGalaxy = comingSoonConnector({
  id: 'kingdee_galaxy',
  name: 'Kingdee Cloud Galaxy',
  nameZh: '金蝶云·星空',
  category: 'ERP',
  market: 'cn',
  iconKey: 'kingdee',
  description: 'Planned: pull fuel and energy purchase receipts and utility expense lines from Kingdee Cloud Galaxy (K/3 Cloud) WebAPI for Scope 1 and Scope 2 activity data.',
  descriptionZh: '规划中：通过金蝶云·星空 WebAPI 获取燃料及能源采购入库单、水电费用凭证，作为范围一、范围二活动数据。',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'Server URL', key: 'serverUrl', secret: false, placeholder: 'https://<tenant>.ik3cloud.com/k3cloud/' },
    { label: 'Data centre ID (账套ID)', key: 'acctId', secret: false },
    { label: 'Integration user', key: 'username', secret: false },
    { label: 'App ID', key: 'appId', secret: false },
    { label: 'App secret', key: 'appSecret', secret: true },
  ],
  fieldMappings: [
    { source: 'FDate (业务日期)', target: 'period_year / period_month' },
    { source: 'FStockOrgId (库存组织)', target: 'facility_code' },
    { source: 'FMaterialId (物料编码)', target: 'fuel_type', notes: 'Mapped via a material → fuel lookup (柴油, 天然气, 电力 …)' },
    { source: 'FRealQty (实收数量)', target: 'activity_value' },
    { source: 'FUnitID (计量单位)', target: 'activity_unit' },
  ],
})

/** 用友 BIP — ERP: purchase receipts / energy cost centre actuals. */
export const yonyouBip = comingSoonConnector({
  id: 'yonyou_bip',
  name: 'Yonyou BIP',
  nameZh: '用友 BIP',
  category: 'ERP',
  market: 'cn',
  iconKey: 'yonyou',
  description: 'Planned: pull fuel, electricity and steam purchase receipts from Yonyou BIP (YonSuite / NC Cloud) Open API for Scope 1 and Scope 2 activity data.',
  descriptionZh: '规划中：通过用友 BIP 开放平台获取燃料、电力、蒸汽采购入库数据，作为范围一、范围二活动数据。',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'Gateway URL', key: 'gatewayUrl', secret: false, placeholder: 'https://api.diwork.com' },
    { label: 'App key', key: 'appKey', secret: false },
    { label: 'App secret', key: 'appSecret', secret: true },
    { label: 'Tenant ID', key: 'tenantId', secret: false },
  ],
  fieldMappings: [
    { source: 'vouchdate (单据日期)', target: 'period_year / period_month' },
    { source: 'org (库存组织)', target: 'facility_code' },
    { source: 'product (物料)', target: 'fuel_type', notes: 'Mapped via a material → fuel lookup' },
    { source: 'qty (数量)', target: 'activity_value' },
    { source: 'unit (计量单位)', target: 'activity_unit' },
  ],
  docsUrl: 'https://open.yonyoucloud.com/',
})

/** 钉钉 — HR / people: headcount by work location. */
export const dingtalkHr = comingSoonConnector({
  id: 'dingtalk_hr',
  name: 'DingTalk HR',
  nameZh: '钉钉智能人事',
  category: 'HCM',
  market: 'cn',
  iconKey: 'dingtalk',
  description: 'Planned: pull the DingTalk smart-HR roster (headcount, gender, contract type by work location) for workforce metrics and Scope 3 Cat 7 commuting baselines.',
  descriptionZh: '规划中：获取钉钉智能人事花名册（按工作地点统计人数、性别、用工类型），用于员工指标及范围三类别 7 通勤排放基线。',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'AppKey (Client ID)', key: 'appKey', secret: false },
    { label: 'AppSecret (Client secret)', key: 'appSecret', secret: true },
    { label: 'CorpId', key: 'corpId', secret: false },
  ],
  fieldMappings: [
    { source: 'workPlace (工作地点)', target: 'facility_code' },
    { source: '(count of active employees)', target: 'activity_value', notes: 'Aggregated headcount per work location' },
    { source: '"persons"', target: 'activity_unit' },
  ],
  defaultBaseUrl: 'https://api.dingtalk.com',
  docsUrl: 'https://open.dingtalk.com/document/',
})

/** 飞书 — HR / people: Feishu People (飞书人事) employee records. */
export const feishuPeople = comingSoonConnector({
  id: 'feishu_people',
  name: 'Feishu People',
  nameZh: '飞书人事',
  category: 'HCM',
  market: 'cn',
  iconKey: 'feishu',
  description: 'Planned: pull Feishu People employee records (headcount, gender, employment type by work location) for workforce metrics and Scope 3 Cat 7 commuting baselines.',
  descriptionZh: '规划中：获取飞书人事员工档案（按工作地点统计人数、性别、雇佣类型），用于员工指标及范围三类别 7 通勤排放基线。',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'App ID', key: 'appId', secret: false },
    { label: 'App secret', key: 'appSecret', secret: true },
  ],
  fieldMappings: [
    { source: 'work_location (工作地点)', target: 'facility_code' },
    { source: '(count of active employees)', target: 'activity_value', notes: 'Aggregated headcount per work location' },
    { source: '"persons"', target: 'activity_unit' },
  ],
  defaultBaseUrl: 'https://open.feishu.cn',
  docsUrl: 'https://open.feishu.cn/document/',
})

/** 企业微信 — directory: departments and members. */
export const wecomDirectory = comingSoonConnector({
  id: 'wecom_directory',
  name: 'WeCom Directory',
  nameZh: '企业微信通讯录',
  category: 'HCM',
  market: 'cn',
  iconKey: 'wecom',
  description: 'Planned: sync the WeCom (WeChat Work) directory — departments and member counts — to map contributors to entities and provide a headcount baseline.',
  descriptionZh: '规划中：同步企业微信通讯录（部门及成员数），用于将填报人映射到组织实体并提供人数基线。',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'CorpID', key: 'corpId', secret: false },
    { label: 'Contacts Secret (通讯录同步 Secret)', key: 'corpSecret', secret: true },
  ],
  fieldMappings: [
    { source: 'department.name (部门)', target: 'facility_code' },
    { source: '(count of members)', target: 'activity_value', notes: 'Member count per department' },
    { source: '"persons"', target: 'activity_unit' },
  ],
  defaultBaseUrl: 'https://qyapi.weixin.qq.com',
  docsUrl: 'https://developer.work.weixin.qq.com/document/',
})

/** 阿里云 IoT — sub-metering: electricity / gas / water meters via IoT Platform. */
export const aliyunIot = comingSoonConnector({
  id: 'aliyun_iot',
  name: 'Alibaba Cloud IoT Platform',
  nameZh: '阿里云物联网平台',
  category: 'IoT',
  market: 'cn',
  iconKey: 'aliyun',
  description: 'Planned: read cumulative energy, gas and water meter properties from Alibaba Cloud IoT Platform devices for monthly Scope 1 / Scope 2 sub-metering.',
  descriptionZh: '规划中：读取阿里云物联网平台设备的电能、燃气、水表累计量属性，按月汇总为范围一、范围二分项计量数据。',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'AccessKey ID', key: 'accessKeyId', secret: false },
    { label: 'AccessKey secret', key: 'accessKeySecret', secret: true },
    { label: 'Region', key: 'regionId', secret: false, placeholder: 'cn-shanghai' },
    { label: 'IoT instance ID', key: 'iotInstanceId', secret: false },
  ],
  fieldMappings: [
    { source: 'ProductKey / DeviceName', target: 'facility_code', notes: 'Device → facility mapping maintained per connection' },
    { source: 'property time', target: 'period_year / period_month' },
    { source: 'TotalActiveEnergy (累计有功电能)', target: 'activity_value', notes: 'Month-end minus month-start reading' },
    { source: '"kWh" / "m³"', target: 'activity_unit' },
  ],
  defaultBaseUrl: 'https://iot.cn-shanghai.aliyuncs.com',
  docsUrl: 'https://help.aliyun.com/product/30520.html',
})

/** 国家电网 smart metering + 重点用能单位能耗在线监测系统. */
export const stateGridMetering = comingSoonConnector({
  id: 'state_grid_metering',
  name: 'State Grid smart metering & key energy-user online monitoring',
  nameZh: '国家电网智能电表 / 重点用能单位能耗在线监测',
  category: 'Utilities',
  market: 'cn',
  iconKey: 'state-grid',
  description: 'Planned: import monthly metered electricity by customer account from State Grid, and energy consumption reported to the provincial key energy-consuming unit online monitoring system, for Scope 2 and comprehensive energy consumption (tce).',
  descriptionZh: '规划中：按户号导入国家电网月度计量电量，以及报送省级重点用能单位能耗在线监测系统的能耗数据，用于范围二排放及综合能源消费量（吨标准煤）核算。',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'Customer account numbers (户号)', key: 'accountNumbers', secret: false, description: 'Comma-separated electricity customer account numbers' },
    { label: 'Unified social credit code (统一社会信用代码)', key: 'uscc', secret: false },
  ],
  fieldMappings: [
    { source: '户号 (customer account)', target: 'facility_code' },
    { source: '电费年月 (billing month)', target: 'period_year / period_month' },
    { source: '有功电量 (active energy, kWh)', target: 'activity_value' },
    { source: '"kWh"', target: 'activity_unit' },
    { source: '综合能源消费量 (tce, 当量值)', target: 'notes', notes: 'Carried for GB/T 2589 energy reporting' },
  ],
})

/** 全国碳市场 — annual emission report export (outbound). */
export const cnCarbonMarketExport = comingSoonConnector({
  id: 'cn_carbon_market_export',
  name: 'China national carbon market reporting export',
  nameZh: '全国碳市场排放报告导出',
  category: 'Regulatory',
  market: 'cn',
  iconKey: 'carbon-market',
  description: 'Planned (outbound): export approved Scope 1 combustion/process activity data and purchased electricity, with MEE default factors, in the layout of the national carbon market annual emission report for upload to the MEE management platform.',
  descriptionZh: '规划中（导出）：将已审批的化石燃料燃烧、过程排放及购入电力活动数据，按生态环境部核算指南缺省因子生成全国碳市场年度排放报告格式，用于上传至全国碳市场管理平台。',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'Unified social credit code (统一社会信用代码)', key: 'uscc', secret: false },
    { label: 'Industry guideline (行业核算指南)', key: 'guideline', secret: false, placeholder: '发电 / 水泥 / 电解铝 / 钢铁 …' },
  ],
  fieldMappings: [
    { source: 'activity_data (Scope 1, stationary combustion)', target: '化石燃料燃烧排放量', notes: 'Outbound — Nexus is the source' },
    { source: 'activity_data (Scope 1, process)', target: '工业生产过程排放量' },
    { source: 'activity_data (Scope 2, purchased electricity, MWh)', target: '净购入使用的电力排放量', notes: '× MEE national grid factor 0.5703 tCO2/MWh (2022)' },
    { source: 'org_entities.code', target: '排放设施 / 核算边界' },
  ],
})

export const CN_COMING_SOON_CONNECTORS = [
  kingdeeGalaxy,
  yonyouBip,
  dingtalkHr,
  feishuPeople,
  wecomDirectory,
  aliyunIot,
  stateGridMetering,
  cnCarbonMarketExport,
]
