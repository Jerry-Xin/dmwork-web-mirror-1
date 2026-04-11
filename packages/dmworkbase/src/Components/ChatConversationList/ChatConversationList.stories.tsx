import type { Meta, StoryObj } from '@storybook/react-vite'
import ChatConversationList from './index'

const meta: Meta<typeof ChatConversationList> = {
  title: 'GroupCategory/ChatConversationList',
  component: ChatConversationList,
}
export default meta

export const Default: StoryObj<typeof ChatConversationList> = {
  name: '见 GroupCategory.stories.tsx',
  render: () => null,
}
