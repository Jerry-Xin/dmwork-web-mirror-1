import React, { useEffect, useState } from 'react';
import './tokens.css';
import './selection-hint.css';

interface SelectionHintProps {
  rect: DOMRect;
  onClick: () => void;
}

/**
 * 划词浮标 — 对齐 v2 `.octo-select-hint`
 * 渐变药丸形，SVG chat bubble 图标 + "反馈到 Octo" + ⌘K 快捷键标签
 */
export default function SelectionHint({ rect, onClick }: SelectionHintProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const btnWidth = 140;
    const btnHeight = 28;

    // 默认放在选区正下方，水平居中
    let top = rect.bottom + 6;
    let left = rect.left + (rect.width - btnWidth) / 2;

    // 左侧越界
    if (left < 4) left = 4;
    // 右侧越界
    if (left + btnWidth > window.innerWidth - 4) {
      left = window.innerWidth - btnWidth - 4;
    }
    // 下方越界，放到选区上方
    if (top + btnHeight > window.innerHeight - 4) {
      top = rect.top - btnHeight - 6;
    }
    // 上方也越界
    if (top < 4) top = 4;

    setPos({ top, left });
  }, [rect]);

  return (
    <button
      className="octo-select-hint"
      style={{ top: pos.top, left: pos.left }}
      title="反馈给 Octo · 或按 ⌘K"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Chat bubble SVG — 对齐 v2 */}
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3c-4 0-7 3-7 7 0 2.3 1.3 4.3 3.2 5.5l-0.7 2.6c-0.3 0.9 0.6 1.6 1.4 1.1l2.4-1.4c0.5 0.1 1.1 0.2 1.7 0.2 4 0 7-3 7-7s-3-8-8-8z"
          fill="currentColor"
        />
      </svg>
      <span className="octo-select-hint-label">反馈到 Octo</span>
      <span className="octo-select-hint-kbd">⌘K</span>
    </button>
  );
}
