import { defineStrings } from '@/lib/i18n'

export const collaborationStrings = defineStrings({
  en: {
    comments: 'Comments',
    placeholder: 'Comment, or type @ to mention a colleague…',
    send: 'Comment',
    resolve: 'Resolve',
    reopen: 'Reopen',
    resolved: 'Resolved',
    empty: 'No comments yet. Questions about this disclosure stay here, next to the data.',
    mentionHint: 'Mentioned colleagues are notified',
    shortcut: '⌘ Enter to send',
  },
  zh: {
    comments: '评论',
    placeholder: '输入评论，输入 @ 可提及同事…',
    send: '发表',
    resolve: '标记已解决',
    reopen: '重新打开',
    resolved: '已解决',
    empty: '暂无评论。关于该披露项的问题会保留在这里，与数据放在一起。',
    mentionHint: '被提及的同事将收到通知',
    shortcut: '⌘/Ctrl + Enter 发送',
  },
})
