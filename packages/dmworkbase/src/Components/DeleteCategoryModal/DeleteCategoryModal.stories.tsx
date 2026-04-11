import type { Meta, StoryObj } from '@storybook/react-vite'
import DeleteCategoryModal from './index'

const meta: Meta<typeof DeleteCategoryModal> = {
  title: 'GroupCategory/DeleteCategoryModal',
  component: DeleteCategoryModal,
}
export default meta

export const Default: StoryObj<typeof DeleteCategoryModal> = {
  name: '见 GroupCategory.stories.tsx',
  render: () => null,
}
