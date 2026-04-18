import React, { useCallback, useEffect, useState } from 'react';
import SelectionHint from './SelectionHint';
import CmdKPanel from './CmdKPanel';

interface CmdKOverlayProps {
  shadowRoot: ShadowRoot;
}

/**
 * 顶层状态管理：划词浮标 + Cmd+K 弹窗
 */
export default function CmdKOverlay({ shadowRoot }: CmdKOverlayProps) {
  const [selectionText, setSelectionText] = useState('');
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelContext, setPanelContext] = useState<PanelContext | null>(null);

  // 监听划词
  useEffect(() => {
    const onMouseUp = () => {
      // 延迟检测，等浏览器更新 selection
      setTimeout(checkSelection, 10);
    };

    const checkSelection = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() || '';
      if (text.length > 0 && sel?.rangeCount) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionText(text);
        setSelectionRect(rect);
      } else {
        setSelectionText('');
        setSelectionRect(null);
      }
    };

    document.addEventListener('mouseup', onMouseUp, true);
    return () => {
      document.removeEventListener('mouseup', onMouseUp, true);
    };
  }, []);

  const openPanel = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() || selectionText || '';
    setPanelContext({
      selectedText: text,
      pageUrl: location.href,
      pageTitle: document.title || location.href,
      hostname: location.hostname,
    });
    setPanelOpen(true);
    // 打开弹窗时隐藏浮标
    setSelectionText('');
    setSelectionRect(null);
  }, [selectionText]);

  // 监听 Cmd+K 快捷键（ESC 由 CmdKPanel 自行处理，避免重复）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        openPanel();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [openPanel]);

  const handleHintClick = useCallback(() => {
    openPanel();
  }, [openPanel]);

  const handlePanelClose = useCallback(() => {
    setPanelOpen(false);
    setPanelContext(null);
  }, []);

  return (
    <>
      {/* 划词浮标 */}
      {selectionText && selectionRect && !panelOpen && (
        <SelectionHint rect={selectionRect} onClick={handleHintClick} />
      )}

      {/* Cmd+K 弹窗 */}
      {panelOpen && panelContext && (
        <CmdKPanel context={panelContext} onClose={handlePanelClose} />
      )}
    </>
  );
}

export interface PanelContext {
  selectedText: string;
  pageUrl: string;
  pageTitle: string;
  hostname: string;
}
