export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    document.addEventListener('mouseup', () => {
      const text = window.getSelection()?.toString().trim();
      if (!text) return;

      browser.runtime.sendMessage({
        type: 'TEXT_SELECTED',
        text,
      }).catch(() => {
        // 侧边面板未打开时忽略错误
      });
    });
  },
});
