import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelContext } from './CmdKOverlay';
import ConversationEmbed from './ConversationEmbed';
import { resolveApp } from './url-apps';
import './tokens.css';
import './cmdk-panel.css';

interface CmdKPanelProps {
  context: PanelContext;
  onClose: () => void;
}

const QUOTE_PREVIEW_LIMIT = 500;
const TITLE_DISPLAY_LIMIT = 60;

/**
 * Cmd+K 弹窗 — 对齐 v2 content.css
 * 透明背景 + 可拖拽 + 完整发送能力
 */
export default function CmdKPanel({ context, onClose }: CmdKPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [quotedText, setQuotedText] = useState(context.selectedText);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // 拖拽
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
      setIsDragging(true);

      const onMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        setOffset({
          x: dragRef.current.ox + (me.clientX - dragRef.current.startX),
          y: dragRef.current.oy + (me.clientY - dragRef.current.startY),
        });
      };
      const onUp = () => {
        dragRef.current = null;
        setIsDragging(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [offset],
  );

  // App 识别
  const app = resolveApp(context.pageUrl, context.hostname);

  // 标题截断
  const title =
    context.pageTitle.length > TITLE_DISPLAY_LIMIT
      ? context.pageTitle.slice(0, TITLE_DISPLAY_LIMIT) + '…'
      : context.pageTitle;

  // App 副标题
  const appLabel = app.cli ? `${app.name} · ${app.cli}` : app.name;

  // 引用文字
  const preview =
    quotedText.length > QUOTE_PREVIEW_LIMIT
      ? quotedText.slice(0, QUOTE_PREVIEW_LIMIT) + '…'
      : quotedText;
  const isTruncated = quotedText.length > QUOTE_PREVIEW_LIMIT;

  return (
    <div className="octo-cmdk">
      <div
        ref={panelRef}
        className={`octo-cmdk-panel${isDragging ? ' is-dragging' : ''}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {/* 关闭按钮 */}
        <button className="octo-cmdk-close" onClick={onClose} title="关闭 (Esc)">
          ×
        </button>

        {/* 来源栏（可拖拽）：app 图标 + 标题 + app 名 */}
        <div
          ref={sourceRef}
          className={`octo-cmdk-source${isDragging ? ' is-dragging' : ''}`}
          onMouseDown={onDragStart}
          title="按住可拖动浮层"
        >
          <span className="octo-cmdk-source-badge">{app.icon}</span>
          <div className="octo-cmdk-source-text">
            <div className="octo-cmdk-source-title">{title}</div>
            <div className="octo-cmdk-source-url">{appLabel}</div>
          </div>
        </div>

        {/* ① 引用区 */}
        {quotedText && (
          <div className="octo-cmdk-section octo-cmdk-quote-section">
            <div className={`octo-cmdk-quote${isTruncated ? ' is-truncated' : ''}`}>
              {preview}
            </div>
            <button
              className="octo-cmdk-quote-rm"
              title="清除引用"
              onClick={() => setQuotedText('')}
            >
              ×
            </button>
          </div>
        )}

        {/* 对话区：复用 Web 端组件 */}
        <ConversationEmbed
          context={{ ...context, selectedText: quotedText }}
          onMessageSent={onClose}
        />
      </div>
    </div>
  );
}
