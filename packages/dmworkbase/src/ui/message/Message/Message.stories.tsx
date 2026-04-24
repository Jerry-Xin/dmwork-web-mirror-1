import type { Meta, StoryObj } from '@storybook/react'
import Message, { MessageUIProps } from './index'

const meta: Meta<typeof Message> = {
  title: 'ui/message/Message',
  component: Message,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Message>

// 基础 row props
const mockRow = {
  isSend: false,
  isContinue: false,
  isSelected: false,
  showAvatar: true,
  avatarUrl: 'https://i.pravatar.cc/32?img=20',
  senderName: '张三',
  timestamp: '10:30',
  isOnline: true,
}

/**
 * 普通文本消息
 */
export const PlainText: Story = {
  args: {
    type: 'text',
    row: mockRow,
    text: {
      content: '大家早，昨天提的新需求我整理了一下',
      isSend: false,
    },
  },
}

/**
 * Thread 父消息
 */
export const ThreadParentMessage: Story = {
  args: {
    type: 'thread',
    row: mockRow,
    text: {
      content: '📌大家早昨天提的新需求我整理了一下，主要有三点：用户分组、Thread 功能、消息搜索优化。',
      isSend: false,
    },
    thread: {
      replyCount: 12,
      participants: [
        { uid: '1', avatarUrl: 'https://i.pravatar.cc/16?img=30' },
        { uid: '2', avatarUrl: 'https://i.pravatar.cc/16?img=31' },
        { uid: '3', avatarUrl: 'https://i.pravatar.cc/16?img=32' },
        { uid: '4', avatarUrl: 'https://i.pravatar.cc/16?img=33' },
      ],
      lastReplyTime: '沙东惠等6人·5分钟前回复',
      onThreadClick: () => alert('打开 Thread'),
    },
  },
}

/**
 * 图片消息
 */
export const ImageMessage: Story = {
  args: {
    type: 'image',
    row: mockRow,
    singleImage: {
      src: 'https://picsum.photos/800/600',
      width: 800,
      height: 600,
      onClick: () => alert('查看大图'),
    },
  },
}

/**
 * 系统消息
 */
export const SystemNotification: Story = {
  args: {
    type: 'system',
    system: {
      type: 'join',
      text: '李磊 加入了群组',
    },
  },
}

/**
 * 多选模式
 */
export const SelectionMode: Story = {
  args: {
    type: 'text',
    row: mockRow,
    text: {
      content: '这条消息可以被选中',
      isSend: false,
    },
    selectionMode: true,
    isSelected: false,
    onSelect: (selected) => alert(`选中状态: ${selected}`),
  },
}

/**
 * 完整对话场景
 */
export const FullConversation: Story = {
  render: () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '16px' }}>
      {/* 系统消息 */}
      <Message
        type="system"
        system={{
          type: 'join',
          text: '李磊 加入了群组',
        }}
      />
      
      {/* Thread 父消息 */}
      <Message
        type="thread"
        row={{
          ...mockRow,
          senderName: '张兴朝',
          avatarUrl: 'https://i.pravatar.cc/32?img=24',
        }}
        text={{
          content: '📌大家早昨天提的新需求我整理了一下，主要有三点：用户分组、Thread 功能、消息搜索优化。',
          isSend: false,
        }}
        thread={{
          replyCount: 12,
          participants: [
            { uid: '1', avatarUrl: 'https://i.pravatar.cc/16?img=30' },
            { uid: '2', avatarUrl: 'https://i.pravatar.cc/16?img=31' },
          ],
          lastReplyTime: '沙东惠等6人·5分钟前回复',
          onThreadClick: () => alert('打开 Thread'),
        }}
      />
      
      {/* 普通回复 */}
      <Message
        type="text"
        row={{
          ...mockRow,
          senderName: '李四',
          avatarUrl: 'https://i.pravatar.cc/32?img=25',
          timestamp: '10:35',
        }}
        text={{
          content: '好的，需求 1 和 3 我觉得优先级高',
          isSend: false,
        }}
      />
      
      {/* 连续消息 */}
      <Message
        type="text"
        row={{
          ...mockRow,
          senderName: '李四',
          avatarUrl: 'https://i.pravatar.cc/32?img=25',
          timestamp: '10:35',
          isContinue: true,
          showAvatar: false,
        }}
        text={{
          content: 'Thread 功能可以先做简单版本，后续迭代',
          isSend: false,
        }}
      />
      
      {/* 图片消息 */}
      <Message
        type="image"
        row={{
          ...mockRow,
          senderName: '王五',
          avatarUrl: 'https://i.pravatar.cc/32?img=26',
          timestamp: '10:38',
        }}
        singleImage={{
          src: 'https://picsum.photos/600/400',
          width: 600,
          height: 400,
          onClick: () => alert('查看大图'),
        }}
      />
      
      {/* 系统消息 */}
      <Message
        type="system"
        system={{
          type: 'revoke',
          text: '你撤回了一条消息',
        }}
      />
    </div>
  ),
}
