import type { Meta, StoryObj } from '@storybook/react-vite'
import CreateCategoryModal from './index'

const meta: Meta<typeof CreateCategoryModal> = {
  title: 'GroupCategory/CreateCategoryModal',
  component: CreateCategoryModal,
}
export default meta

export const Default: StoryObj<typeof CreateCategoryModal> = {
  name: '见 GroupCategory.stories.tsx',
  render: () => null,
}
