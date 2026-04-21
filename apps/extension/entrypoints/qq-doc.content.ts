/**
 * QQ 文档专用 content script
 * WXT 按文件名自动匹配 docs.qq.com / doc.weixin.qq.com
 * 职责：把 injected-qq-doc.js 注入 MAIN world，访问 window.pad.editor 拿到划词文本
 * injected 脚本通过 window.postMessage 广播 QQ_DOC_TEXT_SELECTED，
 * 由 cmdk-overlay 的 CmdKOverlay 监听并弹出 SelectionHint。
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

    const script = document.createElement('script');
    script.src = browser.runtime.getURL('/injected-qq-doc.js');
    (document.head || document.documentElement).appendChild(script);
  },
});
