import { defineStrings } from '..'

/**
 * Shared display names for region-dependent identity providers and notification
 * channels (see `RegionProfile.sso` / `RegionProfile.notify`). Used by Login,
 * IAM center and Admin settings.
 */
export const integrationStrings = defineStrings({
  en: {
    sso: {
      microsoft: 'Microsoft Entra ID',
      google: 'Google Workspace',
      okta: 'Okta',
      wecom: 'WeCom',
      dingtalk: 'DingTalk',
      feishu: 'Feishu',
    },
    ssoShort: { microsoft: 'Microsoft', google: 'Google', okta: 'Okta', wecom: 'WeCom', dingtalk: 'DingTalk', feishu: 'Feishu' },
    notify: {
      email: 'Email',
      slack: 'Slack',
      teams: 'Microsoft Teams',
      wecom: 'WeCom group bot',
      dingtalk: 'DingTalk group bot',
      feishu: 'Feishu group bot',
      sms: 'SMS',
    },
  },
  zh: {
    sso: {
      microsoft: 'Microsoft Entra ID',
      google: 'Google Workspace',
      okta: 'Okta',
      wecom: '企业微信',
      dingtalk: '钉钉',
      feishu: '飞书',
    },
    ssoShort: { microsoft: 'Microsoft', google: 'Google', okta: 'Okta', wecom: '企业微信', dingtalk: '钉钉', feishu: '飞书' },
    notify: {
      email: '邮件',
      slack: 'Slack',
      teams: 'Microsoft Teams',
      wecom: '企业微信群机器人',
      dingtalk: '钉钉群机器人',
      feishu: '飞书群机器人',
      sms: '短信',
    },
  },
})

/** Monogram + colour used where we show an identity provider without its trademarked logo. */
export const SSO_MARK: Record<string, { mark: string; className: string }> = {
  microsoft: { mark: 'M', className: 'bg-sky-600 text-white' },
  google: { mark: 'G', className: 'bg-white text-zinc-800 ring-1 ring-inset ring-zinc-200' },
  okta: { mark: 'O', className: 'bg-zinc-900 text-white' },
  wecom: { mark: '企', className: 'bg-sky-500 text-white' },
  dingtalk: { mark: '钉', className: 'bg-blue-600 text-white' },
  feishu: { mark: '飞', className: 'bg-teal-500 text-white' },
}
