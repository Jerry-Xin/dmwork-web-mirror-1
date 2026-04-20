import './tokens.css';
import './selection-hint.css';
import ReactDOM from 'react-dom/client';
import CmdKOverlay from './CmdKOverlay';
import { EXTENSION_STORAGE_KEYS } from '../../utils/extensionRuntime';
import { getExtensionTheme } from '../../utils/extensionStorage';

function applyThemeToHost(host: HTMLElement | null, theme: string) {
  if (host) host.setAttribute('data-theme', theme);
}

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
        // Find shadow host for :host([data-theme]) selectors
        const rootNode = container.getRootNode() as ShadowRoot;
        const shadowHost = (rootNode?.host as HTMLElement) ?? null;

        // Apply current theme (async, fire-and-forget)
        void getExtensionTheme().then((theme) => applyThemeToHost(shadowHost, theme));

        // Listen for theme changes
        browser.storage.onChanged.addListener(
          (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, areaName: string) => {
            if (areaName === 'local' && changes[EXTENSION_STORAGE_KEYS.theme]) {
              const newTheme = (changes[EXTENSION_STORAGE_KEYS.theme].newValue as string) || 'paper';
              applyThemeToHost(shadowHost, newTheme);
            }
          },
        );

        const app = document.createElement('div');
        container.append(app);
        const root = ReactDOM.createRoot(app);
        root.render(<CmdKOverlay ctx={ctx} />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
  },
});
