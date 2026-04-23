import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import ConversationList from './index'

const meta: Meta<typeof ConversationList> = {
  title: 'Base/ConversationList',
  component: ConversationList,
  parameters: {
    docs: {
      description: {
        component: 'ConversationList 组件用于显示对话列表。⚠️ 注意：这是一个业务组件，依赖 WKSDK 和全局状态。'
      }
    }
  },
  argTypes: {
    showCategories: {
      control: 'boolean',
      description: '是否显示分类'
    },
    filter: {
      control: 'text',
      description: '搜索过滤器'
    }
  }
}

export default meta

type Story = StoryObj<typeof ConversationList>

export const Default: Story = {
  args: {
    showCategories: true,
    filter: ''
  }
}

export const WithoutCategories: Story = {
  args: {
    showCategories: false,
    filter: ''
  }
}

export const WithSearchFilter: Story = {
  args: {
    showCategories: true,
    filter: 'test'
  }
}

export const LoadingState: Story = {
  args: {
    showCategories: true,
    filter: ''
  }
}