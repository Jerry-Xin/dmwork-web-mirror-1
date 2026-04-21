import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import MessageInput from './index'

const meta: Meta<typeof MessageInput> = {
  title: 'Base/MessageInput',
  component: MessageInput,
  parameters: {
    docs: {
      description: {
        component: 'MessageInput 组件用于消息输入框。⚠️ 注意：这是一个业务组件，依赖 WKSDK 和全局状态。'
      }
    }
  },
  argTypes: {
    conversationId: {
      control: 'text',
      description: '对话 ID'
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用输入框'
    }
  }
}

export default meta

type Story = StoryObj<typeof MessageInput>

export const Default: Story = {
  args: {
    conversationId: 'test-conversation-id',
    disabled: false
  }
}

export const Disabled: Story = {
  args: {
    conversationId: 'test-conversation-id',
    disabled: true
  }
}

export const LoadingState: Story = {
  args: {
    conversationId: '',
    disabled: false
  }
}