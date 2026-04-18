import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import CmdKOverlay from './CmdKOverlay';

export async function mountCmdKOverlay(ctx: ContentScriptContext) {
  const ui = await createShadowRootUi(ctx, {
    name: 'octo-cmdk-root',
    position: 'overlay',
    isolateEvents: true,
    onMount(container) {
      const wrapper = document.createElement('div');
      wrapper.id = 'octo-cmdk-container';
      container.appendChild(wrapper);
      const root = createRoot(wrapper);
      root.render(<CmdKOverlay shadowRoot={container.getRootNode() as ShadowRoot} />);
      return root;
    },
    onRemove(root?: Root) {
      root?.unmount();
    },
  });

  ui.mount();
}
