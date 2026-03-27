import type { Preview } from '@storybook/react-vite'

// 分层 CSS（primitive → semantic），通过 index.css 入口加载
import '../../../packages/dmworkbase/src/theme/index.css'
import './preview.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      name: 'Theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: '☀️ Light' },
          { value: 'dark', title: '🌙 Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme
      if (theme === 'dark') {
        document.body.setAttribute('theme-mode', 'dark')
      } else {
        document.body.removeAttribute('theme-mode')
      }
      return Story()
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
  },
}

export default preview
