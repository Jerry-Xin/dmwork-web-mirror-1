import React, { useEffect, useRef, useState } from 'react';
import type { PanelContext } from './CmdKOverlay';

interface ConversationEmbedProps {
  context: PanelContext;
  onMessageSent: () => void;
}

/**
 * 通过 iframe 嵌入 sidepanel 页面，复用 Web 端完整的对话组件
 * 
 * 这样做的好处：
 * 1. content script 保持轻量，不需要引入整个 @dmwork/base
 * 2. 对话组件在 iframe 里独立运行，和 sidepanel 共享同一套代码
 * 3. 样式完全隔离，不会和宿主页面冲突
 */
export default function ConversationEmbed({
  context,
  onMessageSent,
}: ConversationEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  // sidepanel 页面的 URL（扩展内部页面）
  const sidepanelUrl = browser.runtime.getURL('/entrypoints/sidepanel/index.html');

  useEffect(() => {
    // 监听 iframe 内的消息（发送成功后关闭弹窗）
    const onMessage = (e: MessageEvent) => {
      if (e.data?.__octo_cmdk === true) {
        if (e.data.type === 'message-sent') {
          onMessageSent();
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onMessageSent]);

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
        onLoad={() => setLoading(false)}
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
