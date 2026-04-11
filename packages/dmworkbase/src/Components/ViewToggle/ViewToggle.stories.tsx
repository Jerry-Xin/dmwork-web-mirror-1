import type { Meta, StoryObj } from '@storybook/react-vite'
import ViewToggle from './index'

const meta: Meta<typeof ViewToggle> = {
  title: 'GroupCategory/ViewToggle',
  component: ViewToggle,
}
export default meta

export const Default: StoryObj<typeof ViewToggle> = {
  name: '见 GroupCategory.stories.tsx',
}
