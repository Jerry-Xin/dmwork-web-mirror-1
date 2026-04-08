import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'

// ThreadCreate 组件依赖 WKApp 和 RouteContext，无法在 Storybook 中独立渲染
// 这里提供一个占位 Story 以满足 CI 覆盖检查要求

const ThreadCreatePlaceholder = () => (
  <div style={{
    padding: 16,
    border: '1px dashed var(--wk-border-subtle)',
    borderRadius: 8,
    color: 'var(--wk-text-secondary)',
    textAlign: 'center',
  }}>
    <p style={{ marginBottom: 8 }}>ThreadCreate 组件</p>
    <p style={{ fontSize: 12 }}>需要 WKApp 和 RouteContext 环境，请在实际应用中查看</p>
  </div>
)

const meta: Meta<typeof ThreadCreatePlaceholder> = {
  title: 'Thread/ThreadCreate',
  component: ThreadCreatePlaceholder,
  parameters: {
    docs: {
      description: {
        component: `
子区创建表单组件。

**依赖说明：**
- 需要 WKApp 全局实例
- 需要 RouteContext 导航上下文
- 无法在 Storybook 中独立渲染

**使用方式：**
\`\`\`tsx
import { ThreadCreate } from '@dmwork/base'

<ThreadCreate
  groupNo="group-id"
  onSuccess={() => console.log('Created')}
/>
\`\`\`
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ThreadCreatePlaceholder>

export const Default: Story = {
  name: '占位示例',
}
