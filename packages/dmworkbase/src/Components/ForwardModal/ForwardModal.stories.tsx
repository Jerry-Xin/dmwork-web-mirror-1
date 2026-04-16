import React, { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { userEvent, within, expect } from "@storybook/test"
import { ForwardModal, ForwardItem } from "./ForwardModal"
import type { ForwardModalProps } from "./ForwardModal"

const meta: Meta<typeof ForwardModal> = {
  title: "Components/ForwardModal",
  component: ForwardModal,
  parameters: {
    layout: "centered",
  },
}

export default meta
type Story = StoryObj<typeof ForwardModal>

// ---- mock 数据 ----

const mockItems: ForwardItem[] = [
  {
    channelID: "user-001",
    channelType: 1,
    displayName: "Alice",
  },
  {
    channelID: "user-002",
    channelType: 1,
    displayName: "Bob",
  },
  {
    channelID: "group-001",
    channelType: 2,
    displayName: "前端开发群",
    hasThreads: true,
  },
  {
    channelID: "group-002",
    channelType: 2,
    displayName: "产品讨论组",
    hasThreads: false,
  },
  {
    channelID: "thread-001",
    channelType: 5, // ChannelTypeCommunityTopic
    displayName: "产品周会 #公告",
    isThread: true,
  },
  {
    channelID: "bot-001",
    channelType: 1,
    displayName: "哇哈哈助手",
    isAI: true,
  },
]

// ---- 可交互 wrapper ----

function Interactive(props: Partial<ForwardModalProps> & { initialItems?: ForwardItem[] }) {
  const baseItems = props.initialItems ?? mockItems
  const [selectedIDs, setSelectedIDs] = useState<string[]>(props.selectedIDs ?? [])
  const [inputValue, setInputValue] = useState(props.inputValue ?? "")
  const [keyword, setKeyword] = useState(props.inputValue ?? "")

  // 过滤后的列表（列表项）
  const items = baseItems.filter((item: ForwardItem) =>
    keyword === ""
      ? true
      : item.displayName.toLowerCase().includes(keyword.toLowerCase())
  )
  // 全量列表（头像区，不受搜索影响）
  const allItems = baseItems

  const handleInputChange = (val: string) => {
    setInputValue(val)
    // 在 Story 里即时更新（不加 debounce，方便 play function 断言）
    setKeyword(val)
  }

  return (
    <div style={{ width: 400, border: "1px solid #eee", borderRadius: 8, overflow: "hidden" }}>
      <ForwardModal
        {...props}
        items={items}
        allItems={allItems}
        selectedIDs={selectedIDs}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onToggleSelect={(item: ForwardItem) => {
          setSelectedIDs((prev: string[]) =>
            prev.includes(item.channelID)
              ? prev.filter((id: string) => id !== item.channelID)
              : [...prev, item.channelID]
          )
        }}
        onConfirm={() => {}}
        onCancel={props.onCancel}
      />
    </div>
  )
}

// ---- Stories ----

/** 默认：有列表，未选中任何人。验证列表渲染 + 点击选中行为 */
export const Default: Story = {
  render: () => <Interactive />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)

    // 列表有数据
    await expect(canvas.getByText("Alice")).toBeInTheDocument()
    await expect(canvas.getByText("Bob")).toBeInTheDocument()

    // 确认按钮初始 disabled
    const confirmBtn = canvas.getByRole("button", { name: /确认/i })
    await expect(confirmBtn).toBeDisabled()

    // 点击 Alice → 选中，确认按钮变为可点
    await userEvent.click(canvas.getByText("Alice"))
    await expect(canvas.getByRole("button", { name: /确认\(1\)/i })).not.toBeDisabled()

    // 再次点击 Alice → 取消选中，确认按钮回到 disabled
    await userEvent.click(canvas.getByText("Alice"))
    await expect(canvas.getByRole("button", { name: /确认/i })).toBeDisabled()
  },
}

/** 已选多人：头像区显示 + 确认按钮计数正确 */
export const WithSelected: Story = {
  render: () => <Interactive selectedIDs={["user-001", "group-001", "bot-001"]} />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)

    // 确认按钮显示已选数量
    await expect(canvas.getByRole("button", { name: /确认\(3\)/i })).toBeInTheDocument()

    // 点击已选项目取消
    await userEvent.click(canvas.getByText("Alice"))
    await expect(canvas.getByRole("button", { name: /确认\(2\)/i })).toBeInTheDocument()
  },
}

/** 搜索过滤：输入关键字后列表被过滤 */
export const SearchFiltered: Story = {
  render: () => <Interactive />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)

    // 初始有 Alice 和 Bob
    await expect(canvas.getByText("Alice")).toBeInTheDocument()
    await expect(canvas.getByText("Bob")).toBeInTheDocument()

    // 搜索「群」
    const input = canvas.getByPlaceholderText("搜索")
    await userEvent.clear(input)
    await userEvent.type(input, "群")

    // Alice/Bob 消失，群相关显示
    await expect(canvas.queryByText("Alice")).not.toBeInTheDocument()
    await expect(canvas.getByText("前端开发群")).toBeInTheDocument()

    // 清空搜索恢复
    await userEvent.clear(input)
    await expect(canvas.getByText("Alice")).toBeInTheDocument()
  },
}

/** 空列表：items 为空时显示空状态文案 */
export const EmptyList: Story = {
  render: () => <Interactive initialItems={[]} />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("暂无联系人")).toBeInTheDocument()
  },
}

/** loading 状态：显示加载中文案 */
export const Loading: Story = {
  render: () => (
    <div style={{ width: 400, border: "1px solid #eee", borderRadius: 8, overflow: "hidden" }}>
      <ForwardModal
        items={[]}
        selectedIDs={[]}
        inputValue=""
        loading={true}
        onInputChange={() => {}}
        onToggleSelect={() => {}}
        onConfirm={() => {}}
      />
    </div>
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("加载中…")).toBeInTheDocument()
  },
}
