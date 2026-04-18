import React, { useEffect, useRef, useState } from 'react';

interface SelectionHintProps {
  rect: DOMRect;
  onClick: () => void;
}

/**
 * 划词浮标：选中文字后在选区旁边显示一个小按钮
 * 参考 v2 的 Selection Hint 设计
 */
export default function SelectionHint({ rect, onClick }: SelectionHintProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // 定位：选区右侧，垂直居中
    const btnWidth = 140;
    const btnHeight = 28;
    let top = rect.top + (rect.height - btnHeight) / 2;
    let left = rect.right + 8;

    // 右边放不下，放到选区下方
    if (left + btnWidth > window.innerWidth - 8) {
      left = rect.right - btnWidth;
      top = rect.bottom + 6;
    }

    // 上方越界
    if (top < 4) top = 4;
    // 下方越界
    if (top + btnHeight > window.innerHeight - 4) {
      top = rect.top - btnHeight - 6;
    }

    setPos({ top, left });
  }, [rect]);

  return (
    <button
      ref={btnRef}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => {
        // 防止点击时选区丢失
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 2147483647,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        cursor: 'pointer',
        fontSize: 12,
        color: '#333',
        fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
        whiteSpace: 'nowrap',
        transition: 'box-shadow 150ms ease',
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 14 }}>🐙</span>
      <span>反馈到 Octo</span>
      <kbd
        style={{
          fontSize: 10,
          padding: '1px 4px',
          background: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: 3,
          fontFamily: 'monospace',
          color: '#666',
        }}
      >
        ⌘K
      </kbd>
    </button>
  );
}
