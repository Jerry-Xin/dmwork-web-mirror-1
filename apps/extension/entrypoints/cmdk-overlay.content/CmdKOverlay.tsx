import React, { useCallback, useEffect, useRef, useState } from 'react';
import SelectionHint from './SelectionHint';

export interface PanelContext {
  selectedText: string;
  pageUrl: string;
  pageTitle: string;
  hostname: string;
}

interface InjectedPanelFrame {
  host: HTMLDivElement;
  iframe: HTMLIFrameElement;
}

export default function CmdKOverlay() {
  const [selectionText, setSelectionText] = useState('');
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const iframeUiRef = useRef<InjectedPanelFrame | null>(null);
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

    const host = document.createElement('div');
    host.setAttribute('data-octo-cmdk-iframe-host', 'true');
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.zIndex = '2147483647';
    host.style.background = 'transparent';
    host.style.opacity = '1';
    host.style.pointerEvents = 'auto';

    const shadowRoot = host.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.inset = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.background = 'transparent';
    wrapper.style.opacity = '1';
    wrapper.style.pointerEvents = 'auto';

    const iframe = document.createElement('iframe');
    iframe.src = browser.runtime.getURL('cmdk.html');
    iframe.style.position = 'fixed';
    iframe.style.inset = '0';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.maxWidth = 'none';
    iframe.style.maxHeight = 'none';
    iframe.style.display = 'block';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';
    iframe.style.opacity = '1';
    iframe.allow = 'clipboard-read; clipboard-write';

    iframe.addEventListener('load', () => {
      iframe.contentWindow?.postMessage({ type: 'CMDK_OPEN', context: panelContext }, '*');
    }, { once: true });

    wrapper.append(iframe);
    shadowRoot.append(wrapper);
    document.documentElement.append(host);
    iframeUiRef.current = { host, iframe };
    setPanelOpen(true);
  }, [panelOpen, selectionText]);

  const closePanel = useCallback(() => {
    if (iframeUiRef.current) {
      iframeUiRef.current.host.remove();
      iframeUiRef.current = null;
    }
    document.body.style.overflow = prevOverflowRef.current;
    setPanelOpen(false);
  }, []);

  useEffect(() => () => {
    if (iframeUiRef.current) {
      iframeUiRef.current.host.remove();
      iframeUiRef.current = null;
    }
    document.body.style.overflow = prevOverflowRef.current;
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
