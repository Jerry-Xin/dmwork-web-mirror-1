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
  // 暂存 openPanel 时的 context，等 iframe 内 React 发来 CMDK_READY 再投递，
  // 避免 iframe load 事件早于 CmdKApp useEffect 注册 listener 导致消息丢失
  const pendingContextRef = useRef<PanelContext | null>(null);

  useEffect(() => {
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
    const onMouseUp = () => {
      setTimeout(checkSelection, 10);
    };
    document.addEventListener('mouseup', onMouseUp, true);
    return () => document.removeEventListener('mouseup', onMouseUp, true);
  }, []);

  // QQ 文档走 canvas 渲染，window.getSelection() 拿不到；
  // 由 injected-qq-doc.ts 通过 postMessage 把文本 + 光标位置传过来。
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window) return;
      if (e.data?.type !== 'QQ_DOC_TEXT_SELECTED') return;
      const text = (e.data.text as string | undefined)?.trim();
      if (!text) return;
      const x = typeof e.data.x === 'number' ? e.data.x : 0;
      const y = typeof e.data.y === 'number' ? e.data.y : 0;
      const rect = {
        top: y,
        bottom: y,
        left: x,
        right: x,
        width: 0,
        height: 0,
        x,
        y,
        toJSON: () => ({}),
      } as DOMRect;
      setSelectionText(text);
      setSelectionRect(rect);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
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
    // tokens.css 里的 dark/light/cc-dark 变量都靠 :host([data-theme=...]) 选中；
    // shadow host 不随页面 <html> 走，必须自己根据系统偏好打标，否则 dark 变量永不激活
    host.setAttribute(
      'data-theme',
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    );
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

    // 由 CMDK_READY 握手触发 CMDK_OPEN 投递（见 onMessage 中的处理），
    // 不再用 iframe load 事件 — load 早于 iframe 内 React useEffect 注册 listener
    pendingContextRef.current = panelContext;

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
    pendingContextRef.current = null;
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

  // Listen for messages from iframe (READY handshake + close)
  useEffect(() => {
    const extensionOrigin = new URL(browser.runtime.getURL('cmdk.html')).origin;
    const onMessage = (e: MessageEvent) => {
      // 只信任来自扩展 origin 且源自我们 iframe 的消息
      if (e.origin !== extensionOrigin) return;
      if (e.source !== iframeUiRef.current?.iframe.contentWindow) return;
      if (e.data?.type === 'CMDK_READY') {
        const ctx = pendingContextRef.current;
        if (ctx) {
          iframeUiRef.current.iframe.contentWindow?.postMessage(
            { type: 'CMDK_OPEN', context: ctx },
            extensionOrigin,
          );
          pendingContextRef.current = null;
        }
      } else if (e.data?.type === 'CMDK_CLOSE') {
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
