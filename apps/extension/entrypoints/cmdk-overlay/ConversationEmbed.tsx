import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelContext } from './CmdKOverlay';
import type { CmdkThreadItem } from '../../utils/extensionRuntime';
import MessageInput, { type MentionModel } from '@dmwork/base/src/Components/MessageInput';
import type ConversationContext from '@dmwork/base/src/Components/Conversation/context';
import { Channel, Message, MessageContent, Subscriber } from 'wukongimjssdk';

// Web 端 CSS 变量定义（--input-bg、--border-color 等），WXT 构建会注入 Shadow DOM
import '@dmwork/base/src/App.css';

/** SVG outline icons — 和 v2 sidepanel 保持同步 */
const OUTLINE_ICONS = {
  send: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 2.5L2.5 9l5.5 2.5L10.5 17 17.5 2.5z"/><path d="M8 11.5l9-9"/></svg>',
};

/** 引用文字最大长度 */
const QUOTE_MAX_LENGTH = 500;

interface ConversationEmbedProps {
  context: PanelContext;
  onMessageSent: () => void;
}

/**
 * 构造一个最小化的 ConversationContext mock
 * MessageInput 内部不直接调用大部分方法，只在 mention suggestion 里用到 channel()
 */
function createMockContext(channelId: string, channelType: number): ConversationContext {
  const channel = new Channel(channelId, channelType);
  const noop = () => {};
  const noopAsync = () => Promise.resolve() as any;

  return {
    sendMessage: noopAsync,
    resendMessage: noopAsync,
    scrollToBottom: noop,
    insertText: noop,
    editOn: () => false,
    setEditOn: noop,
    getCheckedMessageCount: () => 0,
    clearCheckedMessages: noop,
    checkeMessage: noop,
    deleteMessages: noop,
    revokeMessage: noopAsync,
    editMessage: noopAsync,
    onTapAvatar: noop,
    showUser: noop,
    reply: noop,
    showContextMenus: noop,
    hideContextMenus: noop,
    channel: () => channel,
    messageInputContext: () => ({
      insertText: noop,
      addMention: noop,
      text: () => undefined,
    }),
    setDragFileCallback: noop,
    getPendingAttachments: () => [],
    addPendingAttachments: () => null,
    removePendingAttachment: noop,
    clearPendingAttachments: noop,
    fowardMessageUI: noop,
    locateMessage: noop,
    getCachedSelectedText: () => null,
  };
}

export default function ConversationEmbed({
  context,
  onMessageSent,
}: ConversationEmbedProps) {
  const [threads, setThreads] = useState<CmdkThreadItem[]>([]);
  const [selected, setSelected] = useState<{ id: string; type: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [members, setMembers] = useState<Subscriber[]>([]);

  const fetchThreads = useCallback(async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'CMDK_FETCH_THREADS',
      });
      if (response?.success && Array.isArray(response.data)) {
        setThreads(response.data);
        if (response.data.length > 0) {
          setSelected((prev) =>
            prev || { id: response.data[0].channelId, type: response.data[0].channelType },
          );
        }
      } else {
        setError('无法获取会话列表');
      }
    } catch (err: any) {
      setError(err?.message || '连接失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const selectedThread = threads.find((t) => t.channelId === selected?.id);

  // 切换频道时获取成员列表
  useEffect(() => {
    if (!selected) {
      setMembers([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await browser.runtime.sendMessage({
          type: 'CMDK_FETCH_MEMBERS',
          channelId: selected.id,
          channelType: selected.type,
        });
        if (!cancelled && response?.success && Array.isArray(response.data)) {
          setMembers(
            response.data.map((m: { uid: string; name: string }) => {
              const sub = new Subscriber();
              sub.uid = m.uid;
              sub.name = m.name;
              return sub;
            }),
          );
        }
      } catch {
        // 获取成员失败不影响主流程
        if (!cancelled) setMembers([]);
      }
    })();

    return () => { cancelled = true; };
  }, [selected?.id, selected?.type]);

  // MessageInput 的 onSend 回调
  const handleSend = useCallback(
    async (text: string, _mention?: MentionModel) => {
      if (!selected || !text.trim()) return;

      setSending(true);
      setError('');

      let quotedText = context.selectedText || undefined;
      if (quotedText && quotedText.length > QUOTE_MAX_LENGTH) {
        quotedText = quotedText.slice(0, QUOTE_MAX_LENGTH) + '…';
      }

      try {
        const response = await browser.runtime.sendMessage({
          type: 'CMDK_SEND_MESSAGE',
          channelId: selected.id,
          channelType: selected.type,
          text: text.trim(),
          quotedText,
          pageUrl: context.pageUrl,
          pageTitle: context.pageTitle,
        });

        if (response?.success) {
          onMessageSent();
        } else {
          setError(response?.error || '发送失败');
          setSending(false);
        }
      } catch (err: any) {
        setError(err?.message || '发送失败');
        setSending(false);
      }
    },
    [selected, context, onMessageSent],
  );

  // 构造 mock context 给 MessageInput
  const mockContext = selected
    ? createMockContext(selected.id, selected.type)
    : createMockContext('', 0);

  // Picker 过滤
  const filteredThreads = pickerQuery.trim()
    ? threads.filter((t) =>
        t.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()),
      )
    : threads;

  if (loading) {
    return (
      <div className="octo-cmdk-empty">
        <div className="octo-cmdk-loading">加载会话列表…</div>
      </div>
    );
  }

  if (error && threads.length === 0) {
    return (
      <div className="octo-cmdk-empty">
        <div style={{ fontSize: '24px' }}>⚠️</div>
        <div className="octo-cmdk-loading">{error}</div>
        <button className="octo-btn octo-btn-sm" onClick={fetchThreads}>
          重试
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 输入区 — 使用 Web 端 MessageInput 组件 */}
      <div className="octo-cmdk-section octo-cmdk-input-section">
        <MessageInput
          context={mockContext}
          onSend={handleSend}
          members={members}
        />
      </div>

      {/* 工具栏 */}
      <div className="octo-cmdk-toolbar">
        {/* 目标选择器 */}
        <button
          className="octo-cmdk-target"
          disabled={sending}
          onClick={() => setPickerOpen(!pickerOpen)}
        >
          <span className="octo-cmdk-target-label">→</span>
          <span className="octo-cmdk-target-name">
            {selectedThread?.name || (selected ? selected.id : '选择会话')}
          </span>
          <span className="octo-cmdk-target-chevron">▾</span>
        </button>
      </div>

      {/* 错误提示 + 发送 */}
      <div className="octo-cmdk-footer">
        {error && <span className="octo-cmdk-err">{error}</span>}
        <div className="octo-cmdk-actions">
          <span className="octo-cmdk-hint-text">Enter 发送 · Shift+Enter 换行</span>
        </div>
      </div>

      {/* Target Picker */}
      {pickerOpen && (
        <div className="octo-cmdk-picker">
          <input
            className="octo-input-text"
            placeholder="搜索 Channel / Thread / 联系人"
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            autoFocus
          />
          <div className="octo-cmdk-picker-list">
            {filteredThreads.length === 0 ? (
              <div className="octo-empty-small">未找到</div>
            ) : (
              filteredThreads.map((t) => (
                <button
                  key={t.channelId}
                  className={`octo-cmdk-picker-item ${
                    t.channelId === selected?.id ? 'is-current' : ''
                  }`}
                  onClick={() => {
                    setSelected({ id: t.channelId, type: t.channelType });
                    setPickerOpen(false);
                    setPickerQuery('');
                  }}
                >
                  <span className="octo-cmdk-pk-icon">
                    {t.channelType === 1 ? '👤' : '#'}
                  </span>
                  <span className="octo-cmdk-pk-name">{t.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
