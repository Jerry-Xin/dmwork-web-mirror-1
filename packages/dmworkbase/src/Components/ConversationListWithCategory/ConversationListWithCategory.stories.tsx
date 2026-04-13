import type { Meta, StoryObj } from '@storybook/react-vite'
import ConversationListWithCategory from './index'

const meta: Meta<typeof ConversationListWithCategory> = {
  title: 'GroupCategory/ConversationListWithCategory',
  component: ConversationListWithCategory,
}
export default meta

export const Default: StoryObj<typeof ConversationListWithCategory> = {
  name: '见 GroupCategory.stories.tsx',
  render: () => null,
}
