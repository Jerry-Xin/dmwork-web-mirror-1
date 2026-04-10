/**
 * QQ 文档专用 content script
 * WXT 按文件名自动匹配 docs.qq.com / doc.weixin.qq.com
 * 职责：注入 main world 脚本 + 监听 postMessage 转发到扩展
 */
export default defineContentScript({
  matches: [
    'https://docs.qq.com/*',
    'https://*.docs.qq.com/*',
    'https://doc.weixin.qq.com/*',
    'https://*.doc.weixin.qq.com/*',
  ],
  runAt: 'document_end',
  main() {
    if (window.top !== window) return;

    // 注入 injected-qq-doc.js 到 MAIN world，访问 window.pad.editor
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('/injected-qq-doc.js');
    (document.head || document.documentElement).appendChild(script);

    // 监听注入脚本通过 postMessage 传回的选中文字
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (event.data?.type !== 'QQ_DOC_TEXT_SELECTED') return;

      const text = event.data.text?.trim();
      if (!text) return;

      browser.runtime.sendMessage({
        type: 'TEXT_SELECTED',
        text,
      }).catch(() => {});
    });
  },
});
