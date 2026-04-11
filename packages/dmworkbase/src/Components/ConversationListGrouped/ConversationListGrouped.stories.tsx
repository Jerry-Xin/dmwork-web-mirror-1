import type { Meta, StoryObj } from '@storybook/react-vite'
import ConversationListGrouped from './index'

const meta: Meta<typeof ConversationListGrouped> = {
  title: 'GroupCategory/ConversationListGrouped',
  component: ConversationListGrouped,
}
export default meta

export const Default: StoryObj<typeof ConversationListGrouped> = {
  name: '见 GroupCategory.stories.tsx',
  render: () => null,
}
