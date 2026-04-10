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
      }).catch(() => {});
    });

    document.addEventListener('selectionchange', () => {
      const text = window.getSelection()?.toString().trim();
      if (!text) lastSentText = '';
    });
  },
});
