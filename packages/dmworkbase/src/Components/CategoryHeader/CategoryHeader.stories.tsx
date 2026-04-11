import type { Meta, StoryObj } from '@storybook/react-vite'
import CategoryHeader from './index'

const meta: Meta<typeof CategoryHeader> = {
  title: 'GroupCategory/CategoryHeader',
  component: CategoryHeader,
}
export default meta

export const Default: StoryObj<typeof CategoryHeader> = {
  name: '见 GroupCategory.stories.tsx',
}
