import './tokens.css';
import './selection-hint.css';
import ReactDOM from 'react-dom/client';
import CmdKOverlay from './CmdKOverlay';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
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
