import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import Avatar from './index'

const meta: Meta<typeof Avatar> = {
  title: 'ui/message/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'number', min: 16, max: 128, step: 4 },
    },
    isOnline: {
      control: 'boolean',
    },
    showOnlineDot: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof Avatar>

/**
 * 默认头像（32×32）
 */
export const Default: Story = {
  args: {
    src: 'https://i.pravatar.cc/32?img=1',
    size: 32,
    alt: '用户头像',
  },
}

/**
 * 在线状态（显示绿点）
 */
export const Online: Story = {
  args: {
    src: 'https://i.pravatar.cc/32?img=2',
    size: 32,
    isOnline: true,
    showOnlineDot: true,
    alt: '在线用户',
  },
}

/**
 * 离线状态（不显示绿点）
 */
export const Offline: Story = {
  args: {
    src: 'https://i.pravatar.cc/32?img=3',
    size: 32,
    isOnline: false,
    showOnlineDot: true,
    alt: '离线用户',
  },
}

/**
 * 大尺寸头像（48×48）
 */
export const Large: Story = {
  args: {
    src: 'https://i.pravatar.cc/48?img=4',
    size: 48,
    isOnline: true,
    showOnlineDot: true,
    alt: '大头像',
  },
}

/**
 * 小尺寸头像（20×20）
 */
export const Small: Story = {
  args: {
    src: 'https://i.pravatar.cc/20?img=5',
    size: 20,
    isOnline: true,
    showOnlineDot: true,
    alt: '小头像',
  },
}

/**
 * 可点击头像（展示 pointer cursor + onClick 回调）
 * 点击头像后会触发 onAvatarClick，Storybook Actions 面板可看到事件记录。
 */
export const Clickable: Story = {
  args: {
    src: 'https://i.pravatar.cc/36?img=10',
    size: 36,
    isOnline: true,
    showOnlineDot: true,
    alt: '可点击头像',
    onClick: (e: React.MouseEvent) => alert(`头像点击 (x: ${e.clientX}, y: ${e.clientY})`),
  },
}

/**
 * 多种尺寸对比
 */
export const SizeComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Avatar src="https://i.pravatar.cc/20?img=6" size={20} isOnline showOnlineDot />
      <Avatar src="https://i.pravatar.cc/32?img=7" size={32} isOnline showOnlineDot />
      <Avatar src="https://i.pravatar.cc/48?img=8" size={48} isOnline showOnlineDot />
      <Avatar src="https://i.pravatar.cc/64?img=9" size={64} isOnline showOnlineDot />
    </div>
  ),
}
