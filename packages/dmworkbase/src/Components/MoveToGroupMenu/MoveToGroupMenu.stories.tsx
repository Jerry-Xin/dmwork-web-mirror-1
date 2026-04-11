import type { Meta, StoryObj } from '@storybook/react-vite'
import MoveToGroupMenu from './index'

const meta: Meta<typeof MoveToGroupMenu> = {
  title: 'GroupCategory/MoveToGroupMenu',
  component: MoveToGroupMenu,
}
export default meta

export const Default: StoryObj<typeof MoveToGroupMenu> = {
  name: '见 GroupCategory.stories.tsx',
}
