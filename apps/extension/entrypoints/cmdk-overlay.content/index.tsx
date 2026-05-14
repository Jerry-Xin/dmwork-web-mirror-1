import './tokens.css';
import './selection-hint.css';
import ReactDOM from 'react-dom/client';
import CmdKOverlay from './CmdKOverlay';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    // 把 window.pluginCall 注入到页面 main world，让网页能主动触发划词弹窗。
    // 越早注入越好，避免页面早期调用拿不到。
    const pluginCallScript = document.createElement('script');
    pluginCallScript.src = browser.runtime.getURL('/injected-plugin-call.js');
    pluginCallScript.onload = () => pluginCallScript.remove();
    (document.head || document.documentElement).appendChild(pluginCallScript);

    const ui = await createShadowRootUi(ctx, {
      name: 'octo-cmdk-root',
      position: 'overlay',
      zIndex: 2147483647,
      isolateEvents: true,
      onMount(container) {
        const app = document.createElement('div');
        container.append(app);
        const root = ReactDOM.createRoot(app);
        root.render(<CmdKOverlay />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
  },
});
