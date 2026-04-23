import type { Meta, StoryObj } from '@storybook/react'
import Timestamp from './index'

const meta: Meta<typeof Timestamp> = {
  title: 'ui/message/Timestamp',
  component: Timestamp,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Timestamp>

const now = Date.now()
const oneHourAgo = now - 3600 * 1000
const yesterday = now - 86400 * 1000

/**
 * 默认格式（HH:mm）
 */
export const Default: Story = {
  args: {
    time: now,
  },
}

/**
 * 完整时间格式
 */
export const FullFormat: Story = {
  args: {
    time: now,
    format: 'YYYY-MM-DD HH:mm:ss',
  },
}

/**
 * 仅时间
 */
export const TimeOnly: Story = {
  args: {
    time: oneHourAgo,
    format: 'HH:mm',
  },
}

/**
 * 日期 + 时间
 */
export const DateTime: Story = {
  args: {
    time: yesterday,
    format: 'MM-DD HH:mm',
  },
}

/**
 * 多种格式对比
 */
export const FormatComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <strong>HH:mm:</strong> <Timestamp time={now} format="HH:mm" />
      </div>
      <div>
        <strong>HH:mm:ss:</strong> <Timestamp time={now} format="HH:mm:ss" />
      </div>
      <div>
        <strong>MM-DD HH:mm:</strong> <Timestamp time={now} format="MM-DD HH:mm" />
      </div>
      <div>
        <strong>YYYY-MM-DD HH:mm:ss:</strong> <Timestamp time={now} format="YYYY-MM-DD HH:mm:ss" />
      </div>
    </div>
  ),
}
