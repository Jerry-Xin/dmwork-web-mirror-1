import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import GlobalSearch from './index'

const meta: Meta<typeof GlobalSearch> = {
  title: 'Base/GlobalSearch',
  component: GlobalSearch,
  parameters: {
    docs: {
      description: {
        component: 'GlobalSearch 组件用于全局搜索功能。⚠️ 注意：这是一个业务组件，依赖 WKSDK 和全局状态。'
      }
    }
  },
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: '是否打开搜索面板'
    },
    onClose: {
      action: 'closed',
      description: '关闭回调'
    }
  }
}

export default meta

type Story = StoryObj<typeof GlobalSearch>

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Search closed')
  }
}

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => console.log('Search closed')
  }
}