import type {
  ChannelPickerCategory,
  ChannelPickerItem,
} from "@dmwork/base/src/Components/ChannelPicker";
import type { ContextMenusData } from "@dmwork/base/src/Components/ContextMenus";
import { WKApp } from "@dmwork/base";
import CategoryService from "@dmwork/base/src/Service/CategoryService";
import { ChannelSettingManager } from "@dmwork/base/src/Service/ChannelSetting";
import { Channel, ChannelTypeGroup, WKSDK } from "wukongimjssdk";
import { ChannelTypeCommunityTopic } from "@dmwork/base/src/Service/Const";

interface PickerContextMenuOptions {
  categories: ChannelPickerCategory[];
  refresh: () => void | Promise<void>;
  confirm: (content: string, onOk: () => void | Promise<void>) => void;
  onOpenCreateCategory: () => void;
  onCreateGroupInCategory?: (categoryId: string) => void;
  onConversationClosed?: (item: ChannelPickerItem) => void;
  onShowMessage?: (message: string) => void;
}

function getSpaceId(onShowMessage?: (message: string) => void) {
  const spaceId = WKApp.shared.currentSpaceId;
  if (spaceId) {
    return spaceId;
  }
  onShowMessage?.("未选中 Space，无法操作分组");
  return null;
}

async function clearMessagesForItem(item: ChannelPickerItem) {
  const channel = new Channel(item.channelId, item.channelType);
  const conversation = WKSDK.shared().conversationManager.findConversation(channel);
  if (!conversation) {
    return;
  }

  await WKApp.conversationProvider.clearConversationMessages(conversation);
  conversation.lastMessage = undefined;
}

export function buildChannelPickerItemContextMenus({
  categories,
  refresh,
  confirm,
  onOpenCreateCategory,
  onConversationClosed,
}: PickerContextMenuOptions) {
  return (item: ChannelPickerItem): ContextMenusData[] => {
    const channel = new Channel(item.channelId, item.channelType);
    const menus: ContextMenusData[] = [];

    if (item.unread > 0) {
      menus.push({
        title: "标为已读",
        icon: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
        onClick: async () => {
          await WKApp.apiClient.put("conversation/clearUnread", {
            channel_id: item.channelId,
            channel_type: item.channelType,
            unread: 0,
          });
          await refresh();
        },
      });
    }

    menus.push({
      title: "关闭聊天窗口",
      icon: "M18 6 6 18 M6 6l12 12",
      onClick: () => {
        confirm("确定要关闭此聊天窗口吗？", async () => {
          await WKApp.conversationProvider.deleteConversation(channel);
          onConversationClosed?.(item);
          await refresh();
        });
      },
    });

    if (item.channelType === ChannelTypeGroup && categories.length > 0) {
      const currentCategoryId = item.categoryId;
      const defaultCategory = categories.find((category) => category.isDefault);
      const moveToChildren: ContextMenusData[] = categories
        .filter((category) => !category.isDefault && category.id !== currentCategoryId)
        .map((category) => ({
          title: category.name,
          checked: false,
          onClick: async () => {
            await CategoryService.moveGroupToCategory(item.channelId, {
              category_id: category.id,
            });
            await refresh();
          },
        }));

      moveToChildren.push({ separator: true } as ContextMenusData);
      moveToChildren.push({
        title: "+ 新建分组",
        onClick: onOpenCreateCategory,
      });

      menus.push({
        title: "移到分组",
        icon: "M2 9V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4 M12 3v5h5 M9 15l3 3 3-3 M12 12v6",
        children: moveToChildren,
      });

      if (currentCategoryId && defaultCategory) {
        const currentCategoryName =
          categories.find((category) => category.id === currentCategoryId)?.name ??
          "当前分组";
        menus.push({
          title: "移出分组",
          icon: "M2 9V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4 M12 3v5h5 M9 18l3-3 3 3 M12 21v-6",
          onClick: () => {
            confirm(
              `确定将此群聊从「${currentCategoryName}」移出到默认分组吗？`,
              async () => {
                await CategoryService.moveGroupToCategory(item.channelId, {
                  category_id: defaultCategory.id,
                });
                await refresh();
              }
            );
          },
        });
      }
    }

    menus.push({
      title: item.muted ? "关闭免打扰" : "开启免打扰",
      icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
      onClick: async () => {
        await ChannelSettingManager.shared.mute(!item.muted, channel);
        await WKSDK.shared().channelManager.fetchChannelInfo(channel).catch(() => null);
        if (item.channelType === ChannelTypeGroup) {
          const conversations = WKSDK.shared().conversationManager.conversations ?? [];
          const subChannels = conversations
            .map((conv) => conv.channel)
            .filter((ch) => {
              if (ch.channelType !== ChannelTypeCommunityTopic) return false;
              const info = WKSDK.shared().channelManager.getChannelInfo(ch);
              return info?.orgData?.parentGroupNo === item.channelId;
            });
          await Promise.all(
            subChannels.map((ch) =>
              WKSDK.shared().channelManager.fetchChannelInfo(ch).catch(() => null)
            )
          );
        }
        await refresh();
      },
    });

    menus.push({ separator: true } as ContextMenusData);
    menus.push({
      title: "更多",
      icon: "M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0 M12 5m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0 M12 19m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0",
      children: [
        {
          title: "清空聊天记录",
          danger: true,
          onClick: () => {
            confirm("确定要清空所有聊天记录吗？此操作不可撤销。", async () => {
              await clearMessagesForItem(item);
              await refresh();
            });
          },
        },
        {
          title: "关闭窗口并清空记录",
          danger: true,
          onClick: () => {
            confirm(
              "确定要关闭窗口并清空所有聊天记录吗？此操作不可撤销。",
              async () => {
                await clearMessagesForItem(item);
                await WKApp.conversationProvider.deleteConversation(channel);
                onConversationClosed?.(item);
                await refresh();
              }
            );
          },
        },
      ],
    });

    return menus;
  };
}

export function buildChannelPickerCategoryContextMenus({
  categories,
  refresh,
  confirm,
  onOpenCreateCategory,
  onCreateGroupInCategory,
  onShowMessage,
}: PickerContextMenuOptions) {
  return (category: ChannelPickerCategory): ContextMenusData[] => {
    const index = categories.findIndex((item) => item.id === category.id);
    if (index < 0) {
      return [];
    }

    const orderMenus: ContextMenusData[] = [
      {
        title: "上移",
        icon: "M18 15 12 9 6 15",
        onClick: async () => {
          if (index <= 0) {
            return;
          }
          const spaceId = getSpaceId(onShowMessage);
          if (!spaceId) {
            return;
          }
          const ids = categories.map((item) => item.id);
          [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
          await CategoryService.sort(spaceId, { category_ids: ids });
          await refresh();
        },
      },
      {
        title: "下移",
        icon: "M6 9l6 6 6-6",
        onClick: async () => {
          if (index >= categories.length - 1) {
            return;
          }
          const spaceId = getSpaceId(onShowMessage);
          if (!spaceId) {
            return;
          }
          const ids = categories.map((item) => item.id);
          [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
          await CategoryService.sort(spaceId, { category_ids: ids });
          await refresh();
        },
      },
    ];

    if (category.isDefault) {
      return orderMenus;
    }

    const menus: ContextMenusData[] = [];

    if (onCreateGroupInCategory) {
      menus.push({
        title: "新建群聊",
        icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
        onClick: () => onCreateGroupInCategory(category.id),
      });
      menus.push({ separator: true } as ContextMenusData);
    }

    menus.push({
      title: "重命名",
      icon: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z m-2-2 4 4",
      onClick: async () => {
        const nextName = window.prompt("输入新的分组名称", category.name);
        const trimmed = nextName?.trim();
        if (!trimmed || trimmed === category.name) {
          return;
        }
        const spaceId = getSpaceId(onShowMessage);
        if (!spaceId) {
          return;
        }
        await CategoryService.update(spaceId, category.id, { name: trimmed });
        await refresh();
      },
    });

    menus.push(...orderMenus);
    menus.push({ separator: true } as ContextMenusData);
    menus.push({
      title: "删除分组",
      icon: "M3 6h18 M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6 M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",
      danger: true,
      onClick: () => {
        const spaceId = getSpaceId(onShowMessage);
        if (!spaceId) {
          return;
        }
        confirm(`确定删除「${category.name}」吗？分组内群聊将移至默认分组。`, async () => {
          await CategoryService.delete(spaceId, category.id);
          await refresh();
        });
      },
    });

    menus.push({ separator: true } as ContextMenusData);
    menus.push({
      title: "+ 新建分组",
      onClick: onOpenCreateCategory,
    });

    return menus;
  };
}
