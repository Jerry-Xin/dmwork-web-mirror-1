import React, { useEffect, useRef, useState } from 'react';
import type { PanelContext } from './CmdKOverlay';

interface ConversationEmbedProps {
  context: PanelContext;
  onMessageSent: () => void;
}

/**
 * 通过 iframe 嵌入 sidepanel 页面，复用 Web 端完整的对话组件
 *
 * context 通过 postMessage 传给 iframe，iframe 内的 sidepanel 可据此
 * 预填引用文字、显示来源信息等。
 */
export default function ConversationEmbed({
  context,
  onMessageSent,
}: ConversationEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  const sidepanelUrl = browser.runtime.getURL('sidepanel.html');

  useEffect(() => {
    // 监听 iframe 内的消息（发送成功后关闭弹窗）
    const onMessage = (e: MessageEvent) => {
      if (e.data?.__octo_cmdk !== true) return;
      if (e.data.type === 'message-sent') {
        onMessageSent();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onMessageSent]);

  const handleIframeLoad = () => {
    setLoading(false);
    // iframe 加载完成后，把 context 通过 postMessage 传进去
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          __octo_cmdk: true,
          type: 'cmdk-context',
          payload: {
            selectedText: context.selectedText,
            pageUrl: context.pageUrl,
            pageTitle: context.pageTitle,
            hostname: context.hostname,
          },
        },
        '*',
      );
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            zIndex: 1,
          }}
        >
          <div style={{ color: '#999', fontSize: 13 }}>加载中…</div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={sidepanelUrl}
        onLoad={handleIframeLoad}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allow="clipboard-write"
      />
    </div>
  );
}
