import type { Meta, StoryObj } from '@storybook/react-vite'
import CategoryEmptyState from './index'

const meta: Meta<typeof CategoryEmptyState> = {
  title: 'GroupCategory/CategoryEmptyState',
  component: CategoryEmptyState,
}
export default meta

export const Default: StoryObj<typeof CategoryEmptyState> = {
  name: '见 GroupCategory.stories.tsx',
}
