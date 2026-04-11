import type { Meta, StoryObj } from '@storybook/react-vite'
import AddCategoryButton from './index'

const meta: Meta<typeof AddCategoryButton> = {
  title: 'GroupCategory/AddCategoryButton',
  component: AddCategoryButton,
}
export default meta

export const Default: StoryObj<typeof AddCategoryButton> = {
  name: '见 GroupCategory.stories.tsx',
}
