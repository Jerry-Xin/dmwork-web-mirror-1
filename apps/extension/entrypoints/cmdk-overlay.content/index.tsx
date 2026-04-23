import './tokens.css';
import './selection-hint.css';
import ReactDOM from 'react-dom/client';
import CmdKOverlay from './CmdKOverlay';

export default defineContentScript({
  matches: ['<all_urls>'],
  // 页面上的扩展页/开发者工具等 scheme 下完全不注入，避免浪费进程
  excludeMatches: [
    'chrome://*/*',
    'chrome-extension://*/*',
    'moz-extension://*/*',
    'edge://*/*',
    'about:*',
  ],
  cssInjectionMode: 'ui',
  async main(ctx) {
    // NOTE: 曾尝试懒挂载（index.tsx 只挂 bootstrap listener，首次交互才 createShadowRootUi），
    // 但 createShadowRootUi + React 异步启动有约 50~150ms 延迟，用户划词的 selection 事件
    // 在延迟内就消失，SelectionHint 根本来不及渲染。回滚到 eager mount。
    // 进一步收窄成本见 excludeMatches。
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
