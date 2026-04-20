/** ChannelPicker shared types */

export interface ChannelPickerItem {
  channelId: string;
  channelType: number; // 1=私聊, 2=群聊, 5=子区
  name: string;
  categoryId?: string;
  parentChannelId?: string; // 子区的父频道 ID
  unread: number;
  mentionCount: number; // @ 提醒数
  muted: boolean;
  lastMessageTime: number;
  isBot?: boolean;
}

export interface ChannelPickerCategory {
  id: string;
  name: string;
  order: number;
}

export type ChannelPickerLayoutMode = "tabbed" | "single-panel";

export interface ChannelPickerProps {
  /** 频道列表（群聊） */
  channels: ChannelPickerItem[];
  /** 分类列表 */
  categories: ChannelPickerCategory[];
  /** 私聊列表 */
  privateChats: ChannelPickerItem[];
  /** 当前选中的频道 ID */
  selectedId?: string;
  /** 选中回调 */
  onSelect: (item: ChannelPickerItem) => void;
  /** 关闭回调 */
  onClose?: () => void;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 新建回调 */
  onCreate?: () => void;
  /** 是否显示搜索栏，默认 true */
  showSearch?: boolean;
  /** 列表布局模式 */
  layoutMode?: ChannelPickerLayoutMode;
  /** 加载中 */
  loading?: boolean;
}
