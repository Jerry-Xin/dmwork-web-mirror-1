import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { PanelContext } from './CmdKOverlay';
import type { CmdkThreadItem, CmdkCategoryItem } from '../../utils/extensionRuntime';
import MessageInput, { type MentionModel, type MessageInputContext } from '@dmwork/base/src/Components/MessageInput';
import type ConversationContext from '@dmwork/base/src/Components/Conversation/context';
import { Channel, Message, MessageContent, Subscriber } from 'wukongimjssdk';
import ChannelPicker from '@dmwork/base/src/Components/ChannelPicker';
import type { ChannelPickerItem, ChannelPickerCategory } from '@dmwork/base/src/Components/ChannelPicker';

// Web 端 CSS 变量定义（--input-bg、--border-color 等），WXT 构建会注入 Shadow DOM
import '@dmwork/base/src/App.css';

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

/** 轻量版工具栏：表情 + @ */
function CmdkToolbar({ inputContextRef }: { inputContextRef: React.RefObject<MessageInputContext | null> }) {
  const [emojiOpen, setEmojiOpen] = useState(false);

  // 常用表情快捷列表
  const quickEmojis = useMemo(() => [
    '👍', '😄', '❤️', '😂', '👏',
    '🙏', '🔥', '🎉', '😍', '😢',
    '😱', '🤔', '👀', '✅', '❌',
    '🚀', '🌟', '💪', '🙌', '🌸',
  ], []);

  const handleInsertEmoji = useCallback((emoji: string) => {
    inputContextRef.current?.insertText(emoji);
    setEmojiOpen(false);
  }, [inputContextRef]);

  const handleMentionClick = useCallback(() => {
    inputContextRef.current?.insertText('@');
  }, [inputContextRef]);

  return (
    <>
      {/* 表情按钮 */}
      <div className="wk-messageinput-actionitem" style={{ position: 'relative' }}>
        <button
          className="octo-cmdk-toolbar-btn"
          title="表情"
          onClick={() => setEmojiOpen(!emojiOpen)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>
        {emojiOpen && (
          <div className="octo-cmdk-emoji-panel">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                className="octo-cmdk-emoji-item"
                onClick={() => handleInsertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* @ 按钮 */}
      <div className="wk-messageinput-actionitem">
        <button
          className="octo-cmdk-toolbar-btn"
          title="提及"
          onClick={handleMentionClick}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0V12a10 10 0 1 0-3.92 7.94" />
          </svg>
        </button>
      </div>

      {/* 表情面板防止点击外部关闭 */}
      {emojiOpen && (
        <div
          className="octo-cmdk-emoji-mask"
          onClick={() => setEmojiOpen(false)}
        />
      )}
    </>
  );
}

export default function ConversationEmbed({
  context,
  onMessageSent,
}: ConversationEmbedProps) {
  const [threads, setThreads] = useState<CmdkThreadItem[]>([]);
  const [categories, setCategories] = useState<CmdkCategoryItem[]>([]);
  const [selected, setSelected] = useState<{ id: string; type: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [members, setMembers] = useState<Subscriber[]>([]);
  const inputContextRef = useRef<MessageInputContext | null>(null);

  const fetchThreads = useCallback(async () => {
    try {
      const [threadsResponse, categoriesResponse] = await Promise.all([
        browser.runtime.sendMessage({ type: 'CMDK_FETCH_THREADS' }),
        browser.runtime.sendMessage({ type: 'CMDK_FETCH_CATEGORIES' }),
      ]);

      if (threadsResponse?.success && Array.isArray(threadsResponse.data)) {
        setThreads(threadsResponse.data);
        // 默认不选发送方
      } else {
        setError('无法获取会话列表');
      }

      if (categoriesResponse?.success && Array.isArray(categoriesResponse.data)) {
        setCategories(categoriesResponse.data);
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

  // ChannelPicker onSelect
  const handlePickerSelect = useCallback((item: ChannelPickerItem) => {
    setSelected({ id: item.channelId, type: item.channelType });
    setPickerOpen(false);
  }, []);

  // 将 threads 数据转换为 ChannelPicker 格式
  const pickerChannels: ChannelPickerItem[] = threads
    .filter((t) => t.channelType !== 1)
    .map((t) => ({
      channelId: t.channelId,
      channelType: t.channelType,
      name: t.name,
      categoryId: t.categoryId,
      parentChannelId: t.parentChannelId,
      unread: t.unread,
      mentionCount: t.mentionCount,
      muted: t.muted,
      lastMessageTime: t.lastMessageTime,
      isBot: t.isBot,
    }));

  const pickerPrivateChats: ChannelPickerItem[] = threads
    .filter((t) => t.channelType === 1)
    .map((t) => ({
      channelId: t.channelId,
      channelType: t.channelType,
      name: t.name,
      unread: t.unread,
      mentionCount: t.mentionCount,
      muted: t.muted,
      lastMessageTime: t.lastMessageTime,
      isBot: t.isBot,
    }));

  const pickerCategories: ChannelPickerCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    order: c.order,
  }));

  // 构造 mock context 给 MessageInput
  const mockContext = selected
    ? createMockContext(selected.id, selected.type)
    : createMockContext('', 0);

  if (loading) {
    return (
      <div className="octo-cmdk-center">
        <div className="octo-cmdk-loading">加载会话列表…</div>
      </div>
    );
  }

  if (error && threads.length === 0) {
    return (
      <div className="octo-cmdk-center">
        <div className="octo-cmdk-error-icon">⚠️</div>
        <div className="octo-cmdk-error-text">{error}</div>
        <button className="octo-cmdk-retry" onClick={fetchThreads}>
          重试
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 输入区 — 使用 Web 端 MessageInput 组件 */}
      {selected && (
        <div className="octo-cmdk-section octo-cmdk-input-section">
          {/* key 使 MessageInput 在切换频道时重新挂载，自动清空编辑器 */}
          <MessageInput
            key={selected.id}
            context={mockContext}
            onSend={handleSend}
            members={members}
            onContext={(ctx) => { inputContextRef.current = ctx; }}
            toolbar={<CmdkToolbar inputContextRef={inputContextRef} />}
          />
        </div>
      )}

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
            {selectedThread?.name || (selected ? selected.id : '选择发送方')}
          </span>
          <span className="octo-cmdk-target-chevron">▾</span>
        </button>
      </div>

      {/* 未选择发送方时的提示 */}
      {!selected && !pickerOpen && (
        <div className="octo-cmdk-center">
          <div className="octo-cmdk-loading">请先选择发送方</div>
        </div>
      )}

      {/* 错误提示 + 发送提示 */}
      {selected && (
        <div className="octo-cmdk-footer">
          {error && <span className="octo-cmdk-err">{error}</span>}
          <div className="octo-cmdk-actions">
            <span className="octo-cmdk-hint-text">Enter 发送 · Shift+Enter 换行</span>
          </div>
        </div>
      )}

      {/* ChannelPicker */}
      {pickerOpen && (
        <div className="octo-cmdk-picker">
          <ChannelPicker
            channels={pickerChannels}
            categories={pickerCategories}
            privateChats={pickerPrivateChats}
            selectedId={selected?.id}
            onSelect={handlePickerSelect}
            onClose={() => setPickerOpen(false)}
            onRefresh={() => {
              setLoading(true);
              fetchThreads();
            }}
            loading={loading}
          />
        </div>
      )}
    </>
  );
}
