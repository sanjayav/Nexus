// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AS, renderPage, slice } from '@/test/render'
import { RequireAccess } from '@/features/access/RequireAccess'
import AcceptInvitePage from '@/features/access/AcceptInvitePage'
import { getSlice, useAccessStore } from '@/features/access/store'
import IamCenterPage from '@/features/admin/IamCenterPage'
import LoginPage from '@/features/auth/LoginPage'
import QuestionnairePage from '@/features/frameworks/QuestionnairePage'
import ModuleReviewPage from '@/features/frameworks/ModuleReviewPage'
import { useReportingStore } from '@/store/reporting'

const guarded = (element: React.ReactNode) => <RequireAccess>{element}</RequireAccess>
const routes = [
  { path: '/iam', element: guarded(<IamCenterPage />) },
  { path: '/modules/:moduleId/questionnaire', element: guarded(<QuestionnairePage />) },
  { path: '/modules/:moduleId/review', element: guarded(<ModuleReviewPage />) },
]
const directory = () => getSlice(useAccessStore.getState(), 'lvyuan')
const member = (email: string) => directory().members.find(m => m.email === email)

describe('route guard', () => {
  it('shows a data contributor why they cannot open people management, and who can help', async () => {
    renderPage('/iam', routes, { email: AS.contributor })
    expect(await screen.findByRole('heading', { name: '您无权访问此页面' })).toBeInTheDocument()
    expect(screen.getByText(/您在绿源控股集团的角色为“数据填报人”.*请联系管理员/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'user1@marklytics.co.uk' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '成员与权限' })).not.toBeInTheDocument()
  })

  it('lets the reviewer open the review queue', async () => {
    renderPage('/modules/CN-SSE/review', routes, { email: AS.reviewer })
    expect((await screen.findAllByRole('button', { name: '审核通过' })).length).toBeGreaterThan(0)
  })
})

describe('data entry respects role and framework scope', () => {
  it('a contributor can fill in a framework in scope', async () => {
    renderPage('/modules/CN-SSE/questionnaire', routes, { email: AS.contributor })
    await screen.findByRole('button', { name: /从 Excel 导入/ })
    expect(screen.queryByText(/您仅获授权填报/)).not.toBeInTheDocument()
  })

  it('a contributor sees an out-of-scope framework read-only', async () => {
    renderPage('/modules/HKEX-ESG/questionnaire', routes, { email: AS.contributor })
    expect(await screen.findByText(/您仅获授权填报/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /从 Excel 导入/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交审核' })).not.toBeInTheDocument()
    for (const field of document.querySelectorAll('main textarea, textarea[id^="f-"]')) expect(field).toHaveAttribute('readonly')
  })

  it('an external auditor can read but not change anything', async () => {
    renderPage('/modules/CN-SSE/questionnaire', routes, { email: AS.auditor })
    expect(await screen.findByText(/外部鉴证人员.*不能修改填报内容/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '重新打开编辑' })).not.toBeInTheDocument()
  })
})

describe('review decisions', () => {
  it('a reviewer can send work back but not approve it', async () => {
    renderPage('/modules/CN-SSE/review', routes, { email: AS.reviewer })
    const approve = await screen.findAllByRole('button', { name: '审核通过' })
    approve.forEach(b => expect(b).toBeDisabled())
    expect(screen.getAllByText('您的角色可以评论和退回修改，审核通过须由审批人操作。').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: '退回修改' })[0]).toBeEnabled()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('the four-eyes rule stops the submitter approving their own section until the policy is turned off', async () => {
    const user = userEvent.setup()
    renderPage('/modules/CN-SSE/review', routes)
    act(() =>
      useReportingStore.setState({
        workspaces: {
          lvyuan: {
            sections: { 'CNSSE-CLIM-GOV': { answers: {}, status: 'submitted', submittedBy: 'wangmin' } },
            comments: [],
            activity: [],
            notifications: [],
            tasksDone: [],
          },
        },
      }),
    )
    const notice = await screen.findByText('此部分由您提交，须由其他人员审核通过。')
    const card = notice.closest('article')!
    const approve = within(card).getAllByRole('button', { name: '审核通过' })[0]
    expect(approve).toBeDisabled()
    // A forced click still changes nothing: the action layer applies the same rule.
    fireEvent.click(approve)
    expect(slice().sections['CNSSE-CLIM-GOV'].status).toBe('submitted')

    act(() => void useAccessStore.getState().setPolicy({ ws: 'lvyuan', actorId: 'wangmin' }, { fourEyes: false }))
    await waitFor(() => expect(within(card).getAllByRole('button', { name: '审核通过' })[0]).toBeEnabled())
    await user.click(within(card).getAllByRole('button', { name: '审核通过' })[0])
    expect(slice().sections['CNSSE-CLIM-GOV'].status).toBe('approved')
  })
})

describe('people and access', () => {
  it('invites a colleague and hands over a working link', async () => {
    const user = userEvent.setup()
    renderPage('/iam', routes)
    const email = await screen.findByRole('textbox', { name: '工作邮箱' })
    await user.type(email, 'nope')
    await user.click(screen.getByRole('button', { name: '发送邀请' }))
    expect(await screen.findByText('请输入有效的邮箱地址。')).toBeInTheDocument()

    await user.clear(email)
    await user.type(email, 'xu.lan@lvyuan-demo.example')
    await user.click(screen.getByRole('button', { name: '发送邀请' }))

    const dialog = await screen.findByRole('dialog', { name: '邀请已创建' })
    const invited = member('xu.lan@lvyuan-demo.example')!
    expect(invited).toMatchObject({ status: 'invited', role: 'data_contributor' })
    expect(within(dialog).getByRole('textbox')).toHaveValue(`${window.location.origin}/invite/${invited.token}`)
  })

  it('splits a pasted list into one row per person and flags existing members', async () => {
    const user = userEvent.setup()
    renderPage('/iam', routes)
    const email = await screen.findByRole('textbox', { name: '工作邮箱' })
    fireEvent.paste(email, { clipboardData: { getData: () => 'a@lvyuan-demo.example, li.na@lvyuan-demo.example' } })
    expect(screen.getAllByRole('textbox', { name: '工作邮箱' })).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: '发送 2 份邀请' }))
    expect(await screen.findByText('该成员已在本组织中。')).toBeInTheDocument()
    expect(member('a@lvyuan-demo.example')).toBeUndefined()
  })

  it('changes a role inline and locks the admin’s own row', async () => {
    const user = userEvent.setup()
    renderPage('/iam', routes)
    await user.selectOptions(await screen.findByRole('combobox', { name: '角色: 李娜' }), 'approver')
    expect(member(AS.reviewer)?.role).toBe('approver')
    expect(screen.getByRole('combobox', { name: '角色: 王敏' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: '角色: 王立新' })).toBeDisabled()
  })
})

describe('sign-in', () => {
  const signIn = async (email: string, password = 'marklytics') => {
    cleanup()
    const user = userEvent.setup()
    renderPage('/login', [{ path: '/login', element: <LoginPage /> }], { email: null })
    await user.clear(screen.getByLabelText('工作邮箱'))
    await user.type(screen.getByLabelText('工作邮箱'), email)
    await user.clear(screen.getByLabelText('密码'))
    await user.type(screen.getByLabelText('密码'), password)
    await user.click(screen.getByRole('button', { name: /继续/ }))
  }

  it('refuses suspended accounts, pending invitations and wrong passwords', async () => {
    await signIn('zhao.lei@lvyuan-demo.example')
    expect(await screen.findByText('该账号已被停用，请联系管理员。')).toBeInTheDocument()
    await signIn('zhou.zihao@lvyuan-demo.example')
    expect(await screen.findByText('该邮箱有待接受的邀请，请通过邀请链接设置密码。')).toBeInTheDocument()
    await signIn(AS.reviewer, 'wrong')
    expect(await screen.findByText('邮箱或密码不正确。')).toBeInTheDocument()
    // Each render starts from a fresh directory, so only the last attempt is on record.
    expect(directory().events[0]).toMatchObject({ kind: 'sign_in_failed', target: AS.reviewer })
  })

  it('signs a member in and records it', async () => {
    await signIn(AS.reviewer)
    await waitFor(() => expect(JSON.parse(localStorage.getItem('aeiforo_auth_user')!)).toEqual({ email: AS.reviewer }))
    expect(directory().events[0]).toMatchObject({ kind: 'sign_in', actorId: 'lina' })
  })
})

describe('accepting an invitation', () => {
  const inviteRoutes = [
    { path: '/invite/:token', element: <AcceptInvitePage /> },
    { path: '/', element: <p>home</p> },
  ]

  it('validates, creates the account and signs the person in', async () => {
    const user = userEvent.setup()
    renderPage('/invite/seed-lvyuan-zhouzihao', inviteRoutes, { email: null })
    expect(await screen.findByRole('heading', { name: '加入绿源控股集团' })).toBeInTheDocument()
    expect(screen.getByText('王敏 邀请您以“复核人”身份加入。')).toBeInTheDocument()
    expect(screen.getByLabelText('姓名')).toHaveValue('周子豪')

    await user.type(screen.getByLabelText('设置密码'), 'short')
    await user.click(screen.getByRole('button', { name: '接受邀请并加入' }))
    expect(screen.getByText('密码至少需要 8 个字符。')).toBeInTheDocument()
    expect(screen.getByText('请确认个人信息处理告知后继续。')).toBeInTheDocument()

    await user.type(screen.getByLabelText('设置密码'), '-long-enough')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '接受邀请并加入' }))

    expect(await screen.findByText('home')).toBeInTheDocument()
    expect(member('zhou.zihao@lvyuan-demo.example')).toMatchObject({ status: 'active', role: 'reviewer' })
    expect(JSON.parse(localStorage.getItem('aeiforo_auth_user')!)).toEqual({ email: 'zhou.zihao@lvyuan-demo.example' })
  })

  it('explains an unknown or revoked link', async () => {
    renderPage('/invite/not-a-real-token', inviteRoutes, { email: null })
    expect(await screen.findByRole('heading', { name: '此邀请链接无效' })).toBeInTheDocument()
  })
})
