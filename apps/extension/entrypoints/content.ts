import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { ContentScriptContext } from 'wxt/utils/content-script-context';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx: ContentScriptContext) {
    // 动态 import，只在需要时加载 React 和弹窗组件
    const { mountCmdKOverlay } = await import('./cmdk-overlay/mount');
    await mountCmdKOverlay(ctx);
  },
});
