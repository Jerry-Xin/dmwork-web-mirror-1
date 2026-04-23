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
    // 懒挂载：Shadow DOM + React 只在用户实际要用时再创建
    // 避免每个页面都付出 React 实例 + Shadow DOM + 4 个 listener 的常驻成本
    let mountStarted = false;
    // 记录首次挂载是由 Cmd+K 触发还是由 mouseup 触发
    // Cmd+K 触发的要让 CmdKOverlay mount 时自动 openPanel，用户无感
    let autoOpenOnMount = false;

    const startMount = (opts: { open: boolean }) => {
      if (mountStarted) return;
      mountStarted = true;
      autoOpenOnMount = opts.open;
      void mountOverlay();
    };

    const mountOverlay = async () => {
      const ui = await createShadowRootUi(ctx, {
        name: 'octo-cmdk-root',
        position: 'overlay',
        zIndex: 2147483647,
        isolateEvents: true,
        onMount(container) {
          const app = document.createElement('div');
          container.append(app);
          const root = ReactDOM.createRoot(app);
          root.render(<CmdKOverlay autoOpen={autoOpenOnMount} />);
          return root;
        },
        onRemove(root) {
          root?.unmount();
        },
      });
      ui.mount();
      // 交棒后 bootstrap listener 已经没用了，React 内部有自己的 mouseup/keydown
      document.removeEventListener('mouseup', onBootstrapMouseUp, true);
      document.removeEventListener('keydown', onBootstrapKeyDown, true);
    };

    const onBootstrapMouseUp = () => {
      setTimeout(() => {
        const text = window.getSelection()?.toString().trim() || '';
        // 有选中文字才触发挂载，CmdKOverlay 的 mount effect 会再读一次 selection
        // 把当前选区渲染成 hint，用户无感（延迟 <100ms）
        if (text.length > 0) startMount({ open: false });
      }, 10);
    };

    const onBootstrapKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        startMount({ open: true });
      }
    };

    document.addEventListener('mouseup', onBootstrapMouseUp, true);
    document.addEventListener('keydown', onBootstrapKeyDown, true);
  },
});
