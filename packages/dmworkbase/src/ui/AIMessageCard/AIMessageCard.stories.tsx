import type { Meta, StoryObj } from '@storybook/react'
import AIMessageCard from './index'

const meta: Meta<typeof AIMessageCard> = {
  title: 'UI/AIMessageCard',
  component: AIMessageCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof AIMessageCard>

const mockParticipants = [
  { id: '1', name: 'Thomas AI', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=1' },
  { id: '2', name: 'AoLi', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=2' },
  { id: '3', name: 'GPT-4', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=3' },
]

/**
 * 单个 AI (显示"AI助手" tag)
 */
export const SingleAI: Story = {
  args: {
    participants: [mockParticipants[0]],
    content: '已为您生成代码,请查看附件。',
    messageCount: 3,
    isExpanded: false,
  },
}

/**
 * 多个 AI (显示"AI协作" tag)
 */
export const MultipleAI: Story = {
  args: {
    participants: mockParticipants.slice(0, 2),
    content: 'Thomas AI 和 AoLi 共同完成了这次代码重构,主要改进了性能和可读性。',
    messageCount: 5,
    isExpanded: false,
  },
}

/**
 * 超过5个AI折叠显示 (hover 显示 tooltip)
 */
export const ManyAIs: Story = {
  args: {
    participants: [
      ...mockParticipants,
      { id: '4', name: 'Claude', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=4' },
      { id: '5', name: 'Gemini', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=5' },
      { id: '6', name: 'Llama', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=6' },
    ],
    content: '6个 AI 协作完成了这次大型重构...',
    messageCount: 12,
    isExpanded: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Hover 卡片0.3s后会显示所有AI的名单',
      },
    },
  },
}

/**
 * 已展开状态
 */
export const Expanded: Story = {
  args: {
    participants: mockParticipants.slice(0, 2),
    content: 'Thomas AI 和 AoLi 共同完成了这次代码重构',
    messageCount: 5,
    isExpanded: true,
  },
}

/**
 * 设计稿对比
 */
export const DesignComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', maxWidth: '800px' }}>
      <div>
        <h3 style={{ marginBottom: '12px' }}>单个 AI - AI助手</h3>
        <AIMessageCard
          participants={[mockParticipants[0]]}
          content="已为您生成代码,请查看附件。"
          messageCount={3}
        />
      </div>
      
      <div>
        <h3 style={{ marginBottom: '12px' }}>多个 AI - AI协作</h3>
        <AIMessageCard
          participants={mockParticipants.slice(0, 2)}
          content="Thomas AI 和 AoLi 共同完成了这次代码重构,主要改进了性能和可读性。"
          messageCount={5}
        />
      </div>
      
      <div>
        <h3 style={{ marginBottom: '12px' }}>超过5个AI折叠 (hover 显示 tooltip)</h3>
        <AIMessageCard
          participants={[
            ...mockParticipants,
            { id: '4', name: 'Claude', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=4' },
            { id: '5', name: 'Gemini', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=5' },
            { id: '6', name: 'Llama', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=6' },
          ]}
          content="6个 AI 协作完成了这次大型重构..."
          messageCount={12}
        />
      </div>
      
      <div>
        <h3 style={{ marginBottom: '12px' }}>设计规范检查清单</h3>
        <ul style={{ fontSize: '14px', lineHeight: '1.8' }}>
          <li>✅ 左边条: 4px 宽,蓝紫渐变 (180deg, #41D1FF → #7A61FF)</li>
          <li>✅ AI 头像: 24x24, 重叠 -8px, 白色 2px 边框</li>
          <li>✅ AI 名字: 蓝紫渐变文字 (135deg, #41DFFF → #7F3BF5)</li>
          <li>✅ Tag: 渐变背景 (90deg, #44C5FB → #7D58F5), 白色文字 11px</li>
          <li>✅ "展开X条讨论": 深紫色 #7D58F5, 14px</li>
          <li>✅ 间距: 头像→名字 8px, 名字→tag 8px, 头部→内容 12px</li>
          <li>✅ Tooltip: hover 0.3s 后显示,深色半透明背景</li>
        </ul>
      </div>
    </div>
  ),
}
