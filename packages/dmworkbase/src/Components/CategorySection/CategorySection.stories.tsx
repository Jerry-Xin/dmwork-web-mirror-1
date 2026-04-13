import type { Meta, StoryObj } from '@storybook/react-vite'
import CategorySection from './index'

const meta: Meta<typeof CategorySection> = {
  title: 'GroupCategory/CategorySection',
  component: CategorySection,
}
export default meta

export const Default: StoryObj<typeof CategorySection> = {
  name: '见 GroupCategory.stories.tsx',
}
