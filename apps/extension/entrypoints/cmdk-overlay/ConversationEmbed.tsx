import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelContext } from './CmdKOverlay';
import type { CmdkThreadItem } from '../../utils/extensionRuntime';
import './conversation-embed.css';

interface ConversationEmbedProps {
  context: PanelContext;
  onMessageSent: () => void;
}

/**
 * 轻量对话组件：选频道 + 输入 + 发送
 * 数据通过 background → offscreen 获取和发送
 */
export default function ConversationEmbed({
  context,
  onMessageSent,
}: ConversationEmbedProps) {
  const [threads, setThreads] = useState<CmdkThreadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 加载会话列表
  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = useCallback(async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'CMDK_FETCH_THREADS',
      });
      if (response?.success && Array.isArray(response.data)) {
        setThreads(response.data);
        if (response.data.length > 0 && !selectedId) {
          setSelectedId(response.data[0].channelId);
        }
      } else {
        setError('无法获取会话列表');
      }
    } catch (err: any) {
      setError(err?.message || '连接失败');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const selectedThread = threads.find((t) => t.channelId === selectedId);

  const handleSend = useCallback(async () => {
    if (!selectedId || (!text.trim() && !context.selectedText)) return;

    setSending(true);
    setError('');

    try {
      const response = await browser.runtime.sendMessage({
        type: 'CMDK_SEND_MESSAGE',
        channelId: selectedId,
        channelType: selectedThread?.channelType || 2,
        text: text.trim(),
        quotedText: context.selectedText || undefined,
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
  }, [selectedId, selectedThread, text, context, onMessageSent]);

  // Enter 发送
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (loading) {
    return (
      <div className="cmdk-embed-center">
        <div className="cmdk-embed-loading">加载会话列表…</div>
      </div>
    );
  }

  if (error && threads.length === 0) {
    return (
      <div className="cmdk-embed-center">
        <div className="cmdk-embed-error-icon">⚠️</div>
        <div className="cmdk-embed-error-text">{error}</div>
        <button className="cmdk-embed-retry" onClick={fetchThreads}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="cmdk-embed">
      {/* 频道选择器 */}
      <div className="cmdk-embed-target">
        <button
          className="cmdk-embed-target-btn"
          onClick={() => setPickerOpen(!pickerOpen)}
          disabled={sending}
        >
          <span className="cmdk-embed-target-arrow">→</span>
          <span className="cmdk-embed-target-name">
            {selectedThread?.name || '选择会话'}
          </span>
          <span className="cmdk-embed-target-chevron">▾</span>
        </button>
      </div>

      {/* 频道列表（下拉） */}
      {pickerOpen && (
        <div className="cmdk-embed-picker">
          {threads.map((t) => (
            <button
              key={t.channelId}
              className={`cmdk-embed-picker-item ${
                t.channelId === selectedId ? 'is-current' : ''
              }`}
              onClick={() => {
                setSelectedId(t.channelId);
                setPickerOpen(false);
                inputRef.current?.focus();
              }}
            >
              <span className="cmdk-embed-picker-icon">
                {t.channelType === 1 ? '👤' : '#'}
              </span>
              <span className="cmdk-embed-picker-name">{t.name}</span>
              {t.unread > 0 && (
                <span className="cmdk-embed-picker-unread">{t.unread}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 输入区 */}
      <div className="cmdk-embed-input-wrap">
        <textarea
          ref={inputRef}
          className="cmdk-embed-input"
          placeholder="输入反馈内容… Enter 发送，Shift+Enter 换行"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          rows={3}
          autoFocus
        />
        <div className="cmdk-embed-input-footer">
          {error && <span className="cmdk-embed-input-error">{error}</span>}
          <span className="cmdk-embed-input-hint">
            {text.length > 0 ? `${text.length} 字` : ''}
          </span>
          <button
            className={`cmdk-embed-send ${sending ? 'is-sending' : ''}`}
            onClick={handleSend}
            disabled={sending || (!text.trim() && !context.selectedText)}
            title="发送 (Enter)"
          >
            {sending ? '发送中…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
