import type { Meta, StoryObj } from '@storybook/react-vite'
import CategoryManagePanel from './index'

const meta: Meta<typeof CategoryManagePanel> = {
  title: 'GroupCategory/CategoryManagePanel',
  component: CategoryManagePanel,
}
export default meta

export const Default: StoryObj<typeof CategoryManagePanel> = {
  name: '见 GroupCategory.stories.tsx',
  render: () => null,
}
