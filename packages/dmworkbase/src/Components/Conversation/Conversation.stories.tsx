import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import Conversation from './index'

const meta: Meta<typeof Conversation> = {
  title: 'Base/Conversation',
  component: Conversation,
  parameters: {
    docs: {
      description: {
        component: 'Conversation 组件用于显示聊天对话界面。⚠️ 注意：这是一个业务组件，依赖 WKSDK 和全局状态。'
      }
    }
  },
  argTypes: {
    conversationId: {
      control: 'text',
      description: '对话 ID'
    },
    showHeader: {
      control: 'boolean',
      description: '是否显示头部'
    }
  }
}

export default meta

type Story = StoryObj<typeof Conversation>

export const Default: Story = {
  args: {
    conversationId: 'test-conversation-id',
    showHeader: true
  }
}

export const WithoutHeader: Story = {
  args: {
    conversationId: 'test-conversation-id',
    showHeader: false
  }
}

export const LoadingState: Story = {
  args: {
    conversationId: '',
    showHeader: true
  }
}