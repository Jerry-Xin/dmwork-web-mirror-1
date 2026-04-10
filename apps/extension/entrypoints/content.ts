export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    let lastSentText = '';

    document.addEventListener('mouseup', () => {
      const text = window.getSelection()?.toString().trim();
      if (!text || text === lastSentText) return;

      lastSentText = text;
      browser.runtime.sendMessage({
        type: 'TEXT_SELECTED',
        text,
      }).catch(() => {
        // 侧边面板未打开时忽略错误
      });
    });

    // 选中被清除时重置记录
    document.addEventListener('selectionchange', () => {
      const text = window.getSelection()?.toString().trim();
      if (!text) {
        lastSentText = '';
      }
    });
  },
});
