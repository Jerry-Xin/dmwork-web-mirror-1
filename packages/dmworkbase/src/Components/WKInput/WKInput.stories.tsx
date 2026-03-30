import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import { IconSearchStroked, IconUser } from '@douyinfe/semi-icons'
import WKInput from './index'
import '../../theme/index.css'

const meta: Meta<typeof WKInput> = {
  title: 'Base/WKInput',
  component: WKInput,
  parameters: { layout: 'centered' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof WKInput>

export const Default: Story = {
  args: { placeholder: '请输入…', size: 'md' },
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 280 }}>
      <WKInput size="sm" placeholder="Small" />
      <WKInput size="md" placeholder="Medium（默认）" />
      <WKInput size="lg" placeholder="Large" />
    </div>
  ),
}

export const WithPrefix: Story = {
  args: {
    placeholder: '搜索…',
    prefix: <IconSearchStroked />,
    size: 'md',
  },
}

export const WithSuffix: Story = {
  args: {
    placeholder: '用户名',
    suffix: <IconUser />,
    size: 'md',
  },
}

export const ErrorState: Story = {
  args: { placeholder: '输入有误', error: true, value: 'wrong input', size: 'md' },
}
