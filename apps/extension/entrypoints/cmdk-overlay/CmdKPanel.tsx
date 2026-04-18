import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelContext } from './CmdKOverlay';
import ConversationEmbed from './ConversationEmbed';
import './cmdk-panel.css';

interface CmdKPanelProps {
  context: PanelContext;
  onClose: () => void;
}

const QUOTE_PREVIEW_LIMIT = 300;

/**
 * Cmd+K 弹窗：半透明遮罩 + 居中面板
 * 面板内渲染 Web 端的对话组件
 */
export default function CmdKPanel({ context, onClose }: CmdKPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // ESC 关闭（唯一处理点，CmdKOverlay 不再重复监听）
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
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      setOffset({
        x: dragRef.current.ox + (me.clientX - dragRef.current.startX),
        y: dragRef.current.oy + (me.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [offset]);

  const truncatedText =
    context.selectedText.length > QUOTE_PREVIEW_LIMIT
      ? context.selectedText.slice(0, QUOTE_PREVIEW_LIMIT) + '…'
      : context.selectedText;

  return (
    <div
      className="octo-cmdk-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="octo-cmdk-card"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {/* 顶栏：来源信息 + 关闭按钮，可拖拽 */}
        <div className="octo-cmdk-header" onMouseDown={onDragStart}>
          <span className="octo-cmdk-logo">🐙</span>
          <div className="octo-cmdk-source">
            <div className="octo-cmdk-source-title">{context.pageTitle}</div>
            <div className="octo-cmdk-source-host">{context.hostname}</div>
          </div>
          <button className="octo-cmdk-close" onClick={onClose} title="关闭 (Esc)">
            ×
          </button>
        </div>

        {/* 引用区：显示选中的文字 */}
        {context.selectedText && (
          <div className="octo-cmdk-quote-wrap">
            <div className="octo-cmdk-quote">
              {truncatedText}
              {context.selectedText.length > QUOTE_PREVIEW_LIMIT && (
                <div className="octo-cmdk-quote-fade" />
              )}
            </div>
          </div>
        )}

        {/* 对话区：复用 Web 端组件 */}
        <div className="octo-cmdk-conversation">
          <ConversationEmbed context={context} onMessageSent={onClose} />
        </div>
      </div>
    </div>
  );
}
