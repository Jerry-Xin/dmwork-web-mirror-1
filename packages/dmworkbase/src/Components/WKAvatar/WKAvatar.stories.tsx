import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import WKAvatar from './index'

const meta: Meta<typeof WKAvatar> = {
  title: 'Base/WKAvatar',
  component: WKAvatar,
  parameters: {
    docs: {
      description: {
        component: 'WKAvatar 组件用于显示用户头像。'
      }
    }
  },
  argTypes: {
    userId: {
      control: 'text',
      description: '用户 ID'
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: '头像大小'
    },
    showStatus: {
      control: 'boolean',
      description: '是否显示在线状态'
    }
  }
}

export default meta

type Story = StoryObj<typeof WKAvatar>

export const Default: Story = {
  args: {
    userId: 'test-user-id',
    size: 'medium',
    showStatus: true
  }
}

export const Small: Story = {
  args: {
    userId: 'test-user-id',
    size: 'small',
    showStatus: false
  }
}

export const Large: Story = {
  args: {
    userId: 'test-user-id',
    size: 'large',
    showStatus: true
  }
}

export const WithoutStatus: Story = {
  args: {
    userId: 'test-user-id',
    size: 'medium',
    showStatus: false
  }
}