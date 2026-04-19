import React, { useCallback, useEffect, useRef, useState } from 'react';
import SelectionHint from './SelectionHint';

interface CmdKOverlayProps {
  ctx: any;
}

export interface PanelContext {
  selectedText: string;
  pageUrl: string;
  pageTitle: string;
  hostname: string;
}

export default function CmdKOverlay({ ctx }: CmdKOverlayProps) {
  const [selectionText, setSelectionText] = useState('');
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const iframeUiRef = useRef<any>(null);
  const prevOverflowRef = useRef('');

  useEffect(() => {
    const onMouseUp = () => {
      setTimeout(checkSelection, 10);
    };
    const checkSelection = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() || '';
      if (text.length > 0 && sel?.rangeCount) {
        const range = sel.getRangeAt(0);
        setSelectionText(text);
        setSelectionRect(range.getBoundingClientRect());
      } else {
        setSelectionText('');
        setSelectionRect(null);
      }
    };
    document.addEventListener('mouseup', onMouseUp, true);
    return () => document.removeEventListener('mouseup', onMouseUp, true);
  }, []);

  const openPanel = useCallback(() => {
    if (panelOpen) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim() || selectionText || '';
    const panelContext: PanelContext = {
      selectedText: text,
      pageUrl: location.href,
      pageTitle: document.title || location.href,
      hostname: location.hostname,
    };

    setSelectionText('');
    setSelectionRect(null);

    prevOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const ui = createIframeUi(ctx, {
      page: '/cmdk.html',
      position: 'modal',
      zIndex: 2147483647,
      onBeforeMount(_wrapper, iframe) {
        // WXT only sets inset values for iframe modal UIs. Because iframe is a
        // replaced element, browsers can keep its intrinsic 300x150 size unless
        // we explicitly stretch it to the viewport.
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.maxWidth = 'none';
        iframe.style.maxHeight = 'none';
        iframe.style.display = 'block';
        iframe.style.border = 'none';
        iframe.style.background = 'transparent';
        iframe.allow = 'clipboard-read; clipboard-write';
      },
      onMount(_wrapper, iframe) {
        iframe.addEventListener('load', () => {
          iframe.contentWindow?.postMessage({ type: 'CMDK_OPEN', context: panelContext }, '*');
        });
      },
    });
    ui.mount();
    iframeUiRef.current = ui;
    setPanelOpen(true);
  }, [ctx, panelOpen, selectionText]);

  const closePanel = useCallback(() => {
    if (iframeUiRef.current) {
      iframeUiRef.current.remove();
      iframeUiRef.current = null;
    }
    document.body.style.overflow = prevOverflowRef.current;
    setPanelOpen(false);
  }, []);

  // Listen for close from iframe
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CMDK_CLOSE') {
        closePanel();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [closePanel]);

  // Cmd+K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (panelOpen) {
          closePanel();
        } else {
          openPanel();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [openPanel, closePanel, panelOpen]);

  const handleHintClick = useCallback(() => {
    openPanel();
  }, [openPanel]);

  return (
    <>
      {selectionText && selectionRect && !panelOpen && (
        <SelectionHint rect={selectionRect} onClick={handleHintClick} />
      )}
    </>
  );
}
