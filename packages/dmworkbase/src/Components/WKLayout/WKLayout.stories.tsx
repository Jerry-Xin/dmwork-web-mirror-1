import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import WKLayout from './index'

const meta: Meta<typeof WKLayout> = {
  title: 'Base/WKLayout',
  component: WKLayout,
  parameters: {
    docs: {
      description: {
        component: 'WKLayout 组件用于应用整体布局。'
      }
    }
  },
  argTypes: {
    children: {
      control: false,
      description: '布局内容'
    },
    showSidebar: {
      control: 'boolean',
      description: '是否显示侧边栏'
    },
    showHeader: {
      control: 'boolean',
      description: '是否显示头部'
    }
  }
}

export default meta

type Story = StoryObj<typeof WKLayout>

export const Default: Story = {
  args: {
    showSidebar: true,
    showHeader: true,
    children: <div style={{ padding: '20px' }}>Layout Content</div>
  }
}

export const WithoutSidebar: Story = {
  args: {
    showSidebar: false,
    showHeader: true,
    children: <div style={{ padding: '20px' }}>Content without sidebar</div>
  }
}

export const WithoutHeader: Story = {
  args: {
    showSidebar: true,
    showHeader: false,
    children: <div style={{ padding: '20px' }}>Content without header</div>
  }
}

export const Minimal: Story = {
  args: {
    showSidebar: false,
    showHeader: false,
    children: <div style={{ padding: '20px' }}>Minimal layout</div>
  }
}