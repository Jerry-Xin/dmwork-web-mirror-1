export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const { mountCmdKOverlay } = await import('./cmdk-overlay/mount');
    await mountCmdKOverlay(ctx);
  },
});
