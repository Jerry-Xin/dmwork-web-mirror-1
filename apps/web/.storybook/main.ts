import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
    '@storybook/addon-vitest',
    '@storybook/addon-mcp',
  ],
  framework: '@storybook/react-vite',
  viteFinal: (config) =>
    mergeConfig(config, {
      resolve: {
        alias: {
          '@dmwork/base': path.resolve(__dirname, '../../../packages/dmworkbase/src'),
          '@dmwork/contacts': path.resolve(__dirname, '../../../packages/dmworkcontacts/src'),
          '@dmwork/login': path.resolve(__dirname, '../../../packages/dmworklogin/src'),
        },
      },
    }),
}

export default config