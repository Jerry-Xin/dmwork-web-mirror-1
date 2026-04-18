import React, { useEffect, useRef, useState } from 'react';
import './selection-hint.css';

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
    // 上方也越界（极端情况）
    if (top < 4) top = 4;

    setPos({ top, left });
  }, [rect]);

  return (
    <button
      ref={btnRef}
      className="octo-selection-hint"
      style={{ top: pos.top, left: pos.left }}
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
      <span className="octo-selection-hint-icon">🐙</span>
      <span>反馈到 Octo</span>
      <kbd className="octo-selection-hint-kbd">⌘K</kbd>
    </button>
  );
}
