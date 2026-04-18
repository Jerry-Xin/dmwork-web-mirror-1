import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelContext } from './CmdKOverlay';
import type { CmdkThreadItem } from '../../utils/extensionRuntime';
import './conversation-embed.css';

interface ConversationEmbedProps {
  context: PanelContext;
  onMessageSent: () => void;
}

/** 引用文字最大长度 */
const QUOTE_MAX_LENGTH = 500;

/* ============================================================
   Outline SVG Icons — 对齐 v2 的飞书风 outline icons
   ============================================================ */
const SendIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 2.5L2.5 9l5.5 2.5L10.5 17 17.5 2.5z" />
    <path d="M8 11.5l9-9" />
  </svg>
);

const EmojiIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7.5" />
    <circle cx="7.25" cy="8.25" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="12.75" cy="8.25" r="0.5" fill="currentColor" stroke="none" />
    <path d="M7 12.4c.8 1.1 1.9 1.6 3 1.6s2.2-.5 3-1.6" />
  </svg>
);

const AttachIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 5L7.75 10.75a2.12 2.12 0 0 0 3 3l6-6A4 4 0 0 0 11 2L4.5 8.5A6 6 0 0 0 13 17l4.25-4.25" />
  </svg>
);

const CameraIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6.5h2l1.2-2h7.6L15 6.5h2a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 17 17H3a1.5 1.5 0 0 1-1.5-1.5V8A1.5 1.5 0 0 1 3 6.5z" />
    <circle cx="10" cy="11.5" r="3" />
  </svg>
);

export default function ConversationEmbed({
  context,
  onMessageSent,
}: ConversationEmbedProps) {
  const [threads, setThreads] = useState<CmdkThreadItem[]>([]);
  const [selected, setSelected] = useState<{ id: string; type: number } | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);

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

  // Picker 打开时 focus 搜索框
  useEffect(() => {
    if (pickerOpen) {
      setTimeout(() => pickerSearchRef.current?.focus(), 30);
    }
  }, [pickerOpen]);

  const selectedThread = threads.find((t) => t.channelId === selected?.id);

  const handleSend = useCallback(async () => {
    if (!selected || (!text.trim() && !context.selectedText)) return;

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
  }, [selected, text, context, onMessageSent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // 过滤 picker 列表
  const filteredThreads = pickerQuery.trim()
    ? threads.filter((t) => t.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
    : threads;

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
    <div className="octo-cmdk-embed">
      {/* ② 输入区 */}
      <div className="octo-cmdk-section octo-cmdk-input-section">
        <textarea
          ref={inputRef}
          className="octo-cmdk-input"
          placeholder="输入反馈内容… Enter 发送，Shift+Enter 换行"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          rows={3}
          autoFocus
        />
      </div>

      {/* 工具栏 */}
      <div className="octo-cmdk-toolbar">
        <div className="octo-cmdk-tools-left">
          {/* Emoji 占位按钮 */}
          <button className="octo-cmdk-tool" title="Emoji" disabled={sending}>
            <EmojiIcon />
          </button>
          {/* 附件占位按钮 */}
          <button className="octo-cmdk-tool" title="附件" disabled={sending}>
            <AttachIcon />
          </button>
          {/* 截图占位按钮 */}
          <button className="octo-cmdk-tool" title="截图" disabled={sending}>
            <CameraIcon />
          </button>
        </div>

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

      {/* 底部 footer */}
      <div className="octo-cmdk-footer">
        {error && <span className="octo-cmdk-err">{error}</span>}
        <div className="octo-cmdk-actions">
          <button
            className="octo-cmdk-btn"
            onClick={onMessageSent}
            disabled={sending}
          >
            取消
          </button>
          <button
            className={`octo-cmdk-send${sending ? ' is-sending' : ''}`}
            title="发送 (Enter)"
            onClick={handleSend}
            disabled={sending || !selected || (!text.trim() && !context.selectedText)}
          >
            <SendIcon />
          </button>
        </div>
      </div>

      {/* Target Picker */}
      {pickerOpen && (
        <div className="octo-cmdk-picker">
          <input
            ref={pickerSearchRef}
            className="octo-cmdk-picker-search"
            placeholder="搜索 Channel / Thread"
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
          />
          <div className="octo-cmdk-picker-list">
            {filteredThreads.length === 0 ? (
              <div className="octo-cmdk-center">
                <span className="octo-cmdk-loading">未找到</span>
              </div>
            ) : (
              filteredThreads.map((t) => (
                <button
                  key={t.channelId}
                  className={`octo-cmdk-picker-item${
                    t.channelId === selected?.id ? ' is-current' : ''
                  }`}
                  onClick={() => {
                    setSelected({ id: t.channelId, type: t.channelType });
                    setPickerOpen(false);
                    setPickerQuery('');
                    inputRef.current?.focus();
                  }}
                >
                  <span className="octo-cmdk-pk-icon">
                    {t.channelType === 1 ? '👤' : '#'}
                  </span>
                  <span className="octo-cmdk-pk-name">{t.name}</span>
                  {t.unread > 0 && (
                    <span className="octo-cmdk-pk-unread">{t.unread}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
