import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelContext } from './CmdKOverlay';
import ConversationEmbed from './ConversationEmbed';

interface CmdKPanelProps {
  context: PanelContext;
  onClose: () => void;
}

/**
 * Cmd+K 弹窗：半透明遮罩 + 居中面板
 * 面板内渲染 Web 端的对话组件
 */
export default function CmdKPanel({ context, onClose }: CmdKPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // 拖拽状态
  const [offset, setOffset] = useState({ x: 0, y: 0 });
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => {
        // 点遮罩关闭
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        style={{
          width: 420,
          height: 560,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 48px rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", sans-serif',
        }}
      >
        {/* 顶栏：来源信息 + 关闭按钮，可拖拽 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            cursor: 'grab',
            userSelect: 'none',
            flexShrink: 0,
          }}
          onMouseDown={onDragStart}
        >
          <span style={{ fontSize: 16 }}>🐙</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#111',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {context.pageTitle.length > 50
                ? context.pageTitle.slice(0, 50) + '…'
                : context.pageTitle}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#999',
                fontStyle: 'italic',
              }}
            >
              {context.hostname}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 16,
              color: '#999',
              display: 'grid',
              placeItems: 'center',
              borderRadius: 4,
              flexShrink: 0,
            }}
            title="关闭 (Esc)"
          >
            ×
          </button>
        </div>

        {/* 引用区：显示选中的文字 */}
        {context.selectedText && (
          <div
            style={{
              padding: '8px 14px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                background: '#f5f5f5',
                borderLeft: '2px solid #7C5CFC',
                borderRadius: 4,
                fontSize: 12,
                color: '#555',
                maxHeight: 80,
                overflow: 'hidden',
                lineHeight: 1.5,
                position: 'relative',
              }}
            >
              {context.selectedText.length > 300
                ? context.selectedText.slice(0, 300) + '…'
                : context.selectedText}
              {context.selectedText.length > 200 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 24,
                    background: 'linear-gradient(transparent, #f5f5f5)',
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* 对话区：复用 Web 端组件 */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ConversationEmbed
            context={context}
            onMessageSent={onClose}
          />
        </div>
      </div>
    </div>
  );
}
