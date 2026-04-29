import type { Meta, StoryObj } from '@storybook/react-vite'
import CategorySection from './index'

const meta: Meta<typeof CategorySection> = {
  title: 'GroupCategory/CategorySection',
  component: CategorySection,
}
export default meta

// 占位 story：该组件在 GroupCategory.stories.tsx 中作为子组件有完整 fixture，
// 此处仅注册 meta，渲染返回 null 以避免在 Storybook 渲染/A11y 测试中因缺少
// 必需 props（category 等）导致 `isEmpty` 读取 undefined 报错。
// 与 ConversationListGrouped / DeleteCategoryModal / ChatConversationList 等
// 其他 GroupCategory/* 占位 story 的处理方式保持一致。
export const Default: StoryObj<typeof CategorySection> = {
  name: '见 GroupCategory.stories.tsx',
  render: () => null,
}
