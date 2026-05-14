import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type MentionModel,
  type MessageInputContext,
} from "@dmwork/base/src/Components/MessageInput";
import type ConversationContext from "@dmwork/base/src/Components/Conversation/context";
import ChannelPicker from "@dmwork/base/src/Components/ChannelPicker";
import type {
  ChannelPickerItem,
  ChannelPickerCategory,
} from "@dmwork/base/src/Components/ChannelPicker";
import CreateCategoryModal from "@dmwork/base/src/Components/CreateCategoryModal";
import CategoryService from "@dmwork/base/src/Service/CategoryService";
import { MessageReasonCode } from "@dmwork/base/src/Service/Const";
import {
  WKApp,
  shouldSkipChannelForSpace,
  shouldSkipPersonConversationForSpace,
} from "@dmwork/base";
import { ImageContent } from "@dmwork/base/src/Messages/Image";
import { FileContent } from "@dmwork/base/src/Messages/File/FileContent";
import {
  Channel,
  ChannelInfo,
  ChannelTypePerson,
  ConnectStatus,
  Mention,
  MessageText,
  Reply,
  type SendackPacket,
  Setting,
  Subscriber,
  WKSDK,
} from "wukongimjssdk";
import { resolveApp } from "../cmdk-overlay.content/url-apps";
import OctoComposer, {
  type OctoComposerContext,
} from "../sidepanel/OctoComposer";
import {
  buildChannelPickerCategoryContextMenus,
  buildChannelPickerItemContextMenus,
} from "../../utils/channelPickerContextMenus";
import {
  EXTENSION_MESSAGE_TYPE,
  type ConversationTarget,
  type ExtensionRuntimeMessage,
} from "../../utils/extensionRuntime";
import { formatFileSize, getImageDimensions } from "../../utils/attachment";
import { buildSelectionMarkdownFile } from "./buildSelectionMarkdownFile";
import {
  buildCmdkMessageText,
  type PanelContext,
} from "./buildCmdkMessageText";

interface ThreadItem {
  channelId: string;
  channelType: number;
  name: string;
  unread: number;
  lastMessageTime: number;
  categoryId?: string;
  parentChannelId?: string;
  mentionCount: number;
  muted: boolean;
  isBot?: boolean;
}

interface CategoryItem {
  id: string;
  name: string;
  order: number;
  isDefault?: boolean;
}

const CreateCategoryModalComponent = CreateCategoryModal as any;

const TITLE_DISPLAY_LIMIT = 60;
// 选段超过这个字数走「.md 文件 + 引用消息」两步发送，避免聊天流被巨长引用块淹没
const LONG_QUOTE_THRESHOLD = 500;
const MAX_ATTACHMENTS = 20;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
const SEND_ACK_TIMEOUT = 12000;
const BLOCKED_EXTENSIONS = [
  "exe",
  "bat",
  "sh",
  "cmd",
  "msi",
  "dll",
  "php",
  "jsp",
  "apk",
  "com",
  "scr",
  "pif",
  "vbs",
  "js",
  "wsf",
  "ps1",
];

interface FetchDataOptions {
  sync?: boolean;
  showLoading?: boolean;
}

function applySpaceIdToContent(content: any, channel: Channel) {
  const spaceId = WKApp.shared.currentSpaceId;
  if (!spaceId || channel.channelType !== ChannelTypePerson) {
    return;
  }

  if (typeof content.encodeJSON === "function") {
    const originalEncodeJSON = content.encodeJSON.bind(content);
    content.encodeJSON = () => {
      const obj = originalEncodeJSON();
      obj.space_id = spaceId;
      return obj;
    };
  }

  content.contentObj = { ...(content.contentObj || {}), space_id: spaceId };
}

function getSendAckErrorMessage(reasonCode: number, channel: Channel) {
  switch (reasonCode) {
    case MessageReasonCode.reasonSubscriberNotExist:
      return "您已被踢出群聊";
    case MessageReasonCode.reasonNotAllowSend:
    case MessageReasonCode.reasonNotInWhitelist:
    case MessageReasonCode.reasonInBlacklist: {
      if (channel.channelType === ChannelTypePerson) {
        const channelInfo =
          WKSDK.shared().channelManager.getChannelInfo(channel);
        if (channelInfo?.orgData?.robot === 1) {
          return "请先添加好友后再与该机器人对话";
        }
      }
      return "你已被禁言或全员禁言";
    }
    case MessageReasonCode.reasonChannelNotExist:
      return "会话不存在";
    case MessageReasonCode.reasonAuthFail:
    case MessageReasonCode.reasonConnectKick:
    case MessageReasonCode.reasonQueryTokenError:
      return "登录状态已失效，请重新登录后再试";
    case MessageReasonCode.reasonSenderOffline:
      return "当前连接已断开，请重试";
    case MessageReasonCode.reasonSystemError:
      return "系统错误";
    default:
      return `发送失败（code: ${reasonCode}）`;
  }
}

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function CmdKApp() {
  const [context, setContext] = useState<PanelContext | null>(null);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selected, setSelected] = useState<{ id: string; type: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [members, setMembers] = useState<Subscriber[] | undefined>(undefined);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [composerKey, setComposerKey] = useState(0);
  const inputContextRef = useRef<OctoComposerContext | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragFileCallbackRef = useRef<((file: File) => void) | null>(null);
  const loadDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    ox: number;
    oy: number;
  } | null>(null);
  // 承载拖拽期间挂在 window 上的 mousemove/mouseup，卸载时统一回收
  const dragListenersRef = useRef<{
    onMove: (e: MouseEvent) => void;
    onUp: () => void;
  } | null>(null);
  const sendingRef = useRef(false);
  const parentOriginRef = useRef<string | null>(null);
  // 用 ref 承载 pendingAttachments，避免把它放进 mockContext 的 deps 里导致每次附件变更都重建 context
  const pendingAttachmentsRef = useRef<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // source 校验：只接受来自 parent 窗口的消息
      if (e.source !== window.parent) return;
      if (e.data?.type === "CMDK_OPEN") {
        parentOriginRef.current = e.origin;
        setContext(e.data.context);
      }
    };
    window.addEventListener("message", onMessage);
    // CmdKOverlay 收到 CMDK_READY 后才发 CMDK_OPEN，用 "*" 因为 parent 是宿主页面 origin 不固定；
    // 安全保障在发送方：CmdKOverlay 发 CMDK_OPEN 时指定 extensionOrigin 作为 targetOrigin，
    // Chrome 保证只有匹配 origin 的 iframe 能收到
    try {
      window.parent.postMessage({ type: "CMDK_READY" }, "*");
    } catch {
      /* parent 不可达时忽略 */
    }
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const nextUrls: Record<string, string> = {};

    for (const file of pendingAttachments) {
      if (!file.type.startsWith("image/")) continue;
      nextUrls[getFileKey(file)] = URL.createObjectURL(file);
    }

    setImagePreviewUrls(nextUrls);

    return () => {
      Object.values(nextUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingAttachments]);

  const addPendingAttachments = useCallback(
    (files: File[]): string | null => {
      // 走 ref 而非闭包捕获 pendingAttachments：同一 React 批次里连续调用
      // 两次 addPendingAttachments 时，第二次仍能看到第一次写入的值，不会丢文件；
      // 同时 deps 保持空数组，callback identity 稳定 → mockContext 不会因附件变更而重建
      const current = pendingAttachmentsRef.current;
      const incoming = Array.from(files);

      if (current.length + incoming.length > MAX_ATTACHMENTS) {
        return `最多只能同时发送 ${MAX_ATTACHMENTS} 个文件`;
      }

      for (const file of incoming) {
        const dotIndex = file.name.lastIndexOf(".");
        const ext =
          dotIndex > -1 ? file.name.substring(dotIndex + 1).toLowerCase() : "";
        if (BLOCKED_EXTENSIONS.includes(ext)) {
          return `不允许发送 .${ext} 类型的文件`;
        }
      }

      const totalSize = [...current, ...incoming].reduce(
        (sum, file) => sum + file.size,
        0
      );
      if (totalSize > MAX_TOTAL_SIZE) {
        return "所有文件总大小不能超过 100MB";
      }

      const next = [...current, ...incoming];
      pendingAttachmentsRef.current = next;
      setPendingAttachments(next);
      return null;
    },
    []
  );

  const removePendingAttachment = useCallback((index: number) => {
    const next = pendingAttachmentsRef.current.filter((_, i) => i !== index);
    pendingAttachmentsRef.current = next;
    setPendingAttachments(next);
  }, []);

  const clearPendingAttachments = useCallback(() => {
    pendingAttachmentsRef.current = [];
    setPendingAttachments([]);
  }, []);

  const mockContext = useMemo<ConversationContext>(() => {
    const noop = () => {};
    const noopAsync = () => Promise.resolve() as any;
    const fallbackInputContext: MessageInputContext = {
      insertText: noop,
      addMention: noop,
      text: () => undefined,
    };
    const channel = new Channel(
      selected?.id || "",
      selected?.type ?? ChannelTypePerson
    );
    const contextValue: ConversationContext & {
      _messageInputContext?: OctoComposerContext;
      _pendingInsertText?: string;
    } = {
      sendMessage: noopAsync,
      resendMessage: noopAsync,
      scrollToBottom: noop,
      insertText: (text: string) => {
        if (contextValue._messageInputContext) {
          contextValue._messageInputContext.insertText(text);
          return;
        }
        contextValue._pendingInsertText = `${
          contextValue._pendingInsertText || ""
        }${text}`;
      },
      editOn: () => false,
      setEditOn: noop,
      getCheckedMessageCount: () => 0,
      clearCheckedMessages: noop,
      checkeMessage: noop,
      deleteMessages: noop,
      revokeMessage: noopAsync,
      editMessage: noopAsync,
      onTapAvatar: noop,
      showUser: noop,
      reply: noop,
      showContextMenus: noop,
      hideContextMenus: noop,
      channel: () => channel,
      messageInputContext: () =>
        contextValue._messageInputContext || fallbackInputContext,
      setDragFileCallback: (callback: (file: File) => void) => {
        dragFileCallbackRef.current = callback;
      },
      getPendingAttachments: () => pendingAttachmentsRef.current,
      addPendingAttachments,
      removePendingAttachment,
      clearPendingAttachments,
      fowardMessageUI: noop,
      locateMessage: noop,
      getCachedSelectedText: () => null,
    };

    return contextValue;
  }, [
    addPendingAttachments,
    clearPendingAttachments,
    removePendingAttachment,
    selected?.id,
    selected?.type,
  ]);

  const fetchData = useCallback(async (options: FetchDataOptions = {}) => {
    const { sync = true, showLoading = true } = options;
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError("");

      if (sync) {
        await WKSDK.shared().conversationManager.sync({});
      }
      const conversations = WKSDK.shared().conversationManager.conversations;
      const spaceId = WKApp.shared.currentSpaceId;

      let categoryItems: Array<{
        category_id: string | null;
        name: string;
        sort: number;
        is_default?: boolean;
        groups: Array<{ group_no: string }>;
      }> = [];

      if (spaceId) {
        try {
          categoryItems = await CategoryService.list(spaceId);
        } catch (categoryError) {
          console.warn("[CmdKApp] Failed to load categories:", categoryError);
        }
      }

      const pickerCategories: CategoryItem[] = categoryItems.map(
        (category, index) => ({
          id: category.category_id || `default-${index}`,
          name: category.name === "未分类" ? "默认分组" : category.name,
          order: category.sort ?? index,
          isDefault: Boolean(category.is_default) || category.name === "未分类",
        })
      );

      const groupCategoryMap = new Map<string, string>();
      for (
        let categoryIndex = 0;
        categoryIndex < categoryItems.length;
        categoryIndex += 1
      ) {
        const category = categoryItems[categoryIndex];
        const categoryId = category.category_id || `default-${categoryIndex}`;
        for (const group of category.groups || []) {
          groupCategoryMap.set(group.group_no, categoryId);
        }
      }

      const uncachedChannels = conversations
        .filter(
          (conversation) =>
            !WKSDK.shared().channelManager.getChannelInfo(conversation.channel)
        )
        .map((conversation) => conversation.channel);

      if (uncachedChannels.length > 0) {
        await Promise.all(
          uncachedChannels.map((channel) =>
            WKSDK.shared()
              .channelManager.fetchChannelInfo(channel)
              .catch(() => null)
          )
        );
      }

      const channelList: ThreadItem[] = [];
      const privateChatList: ThreadItem[] = [];

      for (const conversation of conversations) {
        if (shouldSkipChannelForSpace(conversation.channel)) continue;
        if (shouldSkipPersonConversationForSpace(conversation)) continue;

        const channelInfo = WKSDK.shared().channelManager.getChannelInfo(
          conversation.channel
        );
        if (!channelInfo?.orgData?.displayName && !channelInfo?.title) {
          void WKSDK.shared()
            .channelManager.fetchChannelInfo(conversation.channel)
            .catch(() => null);
        }
        const name =
          channelInfo?.orgData?.displayName ||
          channelInfo?.title ||
          conversation.channel.channelID;
        const muted = Boolean(channelInfo?.mute);

        let unread = 0;
        if (
          spaceId &&
          conversation.channel.channelType === ChannelTypePerson &&
          conversation.extra?.spaceUnread !== undefined
        ) {
          unread = Math.max(0, Number(conversation.extra.spaceUnread || 0));
        } else {
          unread = Math.max(0, Number(conversation.unread || 0));
        }

        const item: ThreadItem = {
          channelId: conversation.channel.channelID,
          channelType: conversation.channel.channelType,
          name,
          unread,
          mentionCount:
            conversation.reminders?.filter((reminder) => !reminder.done)
              .length ?? 0,
          muted,
          lastMessageTime: conversation.lastMessage?.timestamp ?? 0,
          categoryId: groupCategoryMap.get(conversation.channel.channelID),
          parentChannelId: channelInfo?.orgData?.parentGroupNo,
          isBot: false,
        };

        if (conversation.channel.channelType === ChannelTypePerson) {
          privateChatList.push(item);
        } else {
          channelList.push(item);
        }
      }

      // 获取好友列表，与 web 端转发弹窗保持一致
      const convIDs = new Set([
        ...channelList.map((c) => c.channelId),
        ...privateChatList.map((c) => c.channelId),
      ]);
      try {
        const friends =
          (await WKApp.dataSource.commonDataSource.searchFriends("")) ?? [];
        for (const info of friends) {
          if (convIDs.has(info.channel.channelID)) continue;
          convIDs.add(info.channel.channelID);
          const friendItem: ThreadItem = {
            channelId: info.channel.channelID,
            channelType: info.channel.channelType,
            name:
              info.orgData?.displayName ||
              info.title ||
              info.channel.channelID,
            unread: 0,
            mentionCount: 0,
            muted: false,
            lastMessageTime: 0,
            isBot: info.orgData?.robot === 1,
          };
          if (info.channel.channelType === ChannelTypePerson) {
            privateChatList.push(friendItem);
          } else {
            channelList.push(friendItem);
          }
        }
      } catch (friendsError) {
        console.warn("[CmdKApp] Failed to load friends:", friendsError);
      }

      let activeTarget: ConversationTarget | null = null;
      try {
        const resp = await browser.runtime.sendMessage({
          type: EXTENSION_MESSAGE_TYPE.getActiveConversation,
        });
        activeTarget = resp?.target ?? null;
        console.log("[CmdK] getActiveConversation resp:", JSON.stringify(resp), "activeTarget:", JSON.stringify(activeTarget));
      } catch (e) {
        activeTarget = null;
        console.warn("[CmdK] getActiveConversation failed:", e);
      }

      const nextThreads = [...channelList, ...privateChatList];
      setThreads(nextThreads);
      setCategories(pickerCategories);
      setSelected((prev) => {
        if (
          prev &&
          nextThreads.some(
            (item) =>
              item.channelId === prev.id && item.channelType === prev.type
          )
        ) {
          console.log("[CmdK] setSelected: keeping prev:", JSON.stringify(prev));
          return prev;
        }

        if (!activeTarget) {
          console.log("[CmdK] setSelected: no activeTarget, setting null. prev was:", JSON.stringify(prev));
          return null;
        }

        const matched = nextThreads.find(
          (item) =>
            item.channelId === activeTarget!.channelId &&
            item.channelType === activeTarget!.channelType
        );
        const result = matched
          ? {
              id: matched.channelId,
              type: matched.channelType,
            }
          : null;
        console.log("[CmdK] setSelected: activeTarget:", JSON.stringify(activeTarget), "matched:", !!matched, "result:", JSON.stringify(result));
        return result;
      });
    } catch (fetchError: any) {
      setError(fetchError?.message || "获取会话失败");
      setThreads([]);
      setCategories([]);
      setSelected(null);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (context) {
      void fetchData();
    }
  }, [context, fetchData]);

  useEffect(() => {
    if (!context) {
      if (loadDebounceTimerRef.current) {
        clearTimeout(loadDebounceTimerRef.current);
        loadDebounceTimerRef.current = null;
      }
      return;
    }

    const scheduleReload = () => {
      if (loadDebounceTimerRef.current) {
        clearTimeout(loadDebounceTimerRef.current);
      }
      loadDebounceTimerRef.current = setTimeout(() => {
        loadDebounceTimerRef.current = null;
        void fetchData({ sync: false, showLoading: false });
      }, 300);
    };

    const handleConversationChange = () => {
      scheduleReload();
    };

    const handleChannelInfoChange = (_channelInfo: ChannelInfo) => {
      scheduleReload();
    };

    WKSDK.shared().conversationManager.addConversationListener(
      handleConversationChange
    );
    WKSDK.shared().channelManager.addListener(handleChannelInfoChange);

    return () => {
      WKSDK.shared().conversationManager.removeConversationListener(
        handleConversationChange
      );
      WKSDK.shared().channelManager.removeListener(handleChannelInfoChange);
      if (loadDebounceTimerRef.current) {
        clearTimeout(loadDebounceTimerRef.current);
        loadDebounceTimerRef.current = null;
      }
    };
  }, [context, fetchData]);

  useEffect(() => {
    if (!selected || selected.type === ChannelTypePerson) {
      setMembers(undefined);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await WKApp.apiClient.get(
          `groups/${encodeURIComponent(selected.id)}/members`,
          { param: { limit: 1000 } }
        );

        if (!cancelled && Array.isArray(data)) {
          setMembers(
            data.map((member: { uid: string; name: string }) => {
              const subscriber = new Subscriber();
              subscriber.uid = member.uid;
              subscriber.name = member.name;
              return subscriber;
            })
          );
        }
      } catch {
        if (!cancelled) {
          setMembers(undefined);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.type]);

  const notifyClose = useCallback((reason: string) => {
    // 回发 parent 的原始 origin（由 CMDK_OPEN 握手捕获），避免向任意窗口泄漏消息
    const target = parentOriginRef.current;
    if (!target) return;
    window.parent.postMessage({ type: "CMDK_CLOSE", reason }, target);
  }, []);

  const ensureSdkConnected = useCallback(async () => {
    if (WKSDK.shared().connectManager.status === ConnectStatus.Connected) {
      return;
    }

    if (!WKApp.loginInfo.isLogined()) {
      throw new Error("未登录");
    }

    WKApp.shared.connectIM();

    await new Promise<void>((resolve, reject) => {
      if (WKSDK.shared().connectManager.status === ConnectStatus.Connected) {
        resolve();
        return;
      }

      const timeoutId = window.setTimeout(() => {
        WKSDK.shared().connectManager.removeConnectStatusListener(listener);
        reject(new Error("IM 连接超时"));
      }, 8000);

      const listener = (status: ConnectStatus, reasonCode?: number) => {
        if (status === ConnectStatus.Connected) {
          window.clearTimeout(timeoutId);
          WKSDK.shared().connectManager.removeConnectStatusListener(listener);
          resolve();
          return;
        }

        if (status === ConnectStatus.ConnectKick || reasonCode === 2) {
          window.clearTimeout(timeoutId);
          WKSDK.shared().connectManager.removeConnectStatusListener(listener);
          reject(new Error("IM 认证失败"));
        }
      };

      WKSDK.shared().connectManager.addConnectStatusListener(listener);
    });
  }, []);

  const sendContent = useCallback(
    async (
      channel: Channel,
      content: any
    ): Promise<{
      messageID: string;
      messageSeq: number;
      clientMsgNo: string;
      clientSeq: number;
    }> => {
      applySpaceIdToContent(content, channel);

      const channelInfo = WKSDK.shared().channelManager.getChannelInfo(channel);
      const setting = new Setting();
      if (channelInfo?.orgData?.receipt === 1) {
        setting.receiptEnabled = true;
      }

      return await new Promise((resolve, reject) => {
        let targetClientSeq: number | null = null;
        let sentMessage: any = null;
        const pendingAcks: SendackPacket[] = [];
        let settled = false;

        const cleanup = () => {
          window.clearTimeout(timeoutId);
          WKSDK.shared().chatManager.removeMessageStatusListener(listener);
        };

        const settleSuccess = (ackPacket: SendackPacket) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({
            messageID: ackPacket.messageID?.toString?.() ?? "",
            messageSeq: ackPacket.messageSeq,
            clientMsgNo: sentMessage?.clientMsgNo ?? "",
            clientSeq: ackPacket.clientSeq,
          });
        };

        const settleFailure = (message: string) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error(message));
        };

        const consumeAck = (ackPacket: SendackPacket) => {
          if (ackPacket.reasonCode === MessageReasonCode.reasonSuccess) {
            settleSuccess(ackPacket);
            return;
          }
          settleFailure(getSendAckErrorMessage(ackPacket.reasonCode, channel));
        };

        const listener = (ackPacket: SendackPacket) => {
          if (targetClientSeq === null) {
            pendingAcks.push(ackPacket);
            return;
          }
          if (ackPacket.clientSeq !== targetClientSeq) {
            return;
          }
          consumeAck(ackPacket);
        };

        const timeoutId = window.setTimeout(() => {
          settleFailure("消息发送超时，请稍后重试");
        }, SEND_ACK_TIMEOUT);

        WKSDK.shared().chatManager.addMessageStatusListener(listener);

        void (async () => {
          try {
            const message = await WKSDK.shared().chatManager.send(
              content,
              channel,
              setting
            );
            sentMessage = message;
            targetClientSeq = message.clientSeq;

            const matchedAck = pendingAcks.find(
              (ackPacket) => ackPacket.clientSeq === targetClientSeq
            );
            if (matchedAck) {
              consumeAck(matchedAck);
            }
          } catch (sendError: any) {
            settleFailure(sendError?.message || "发送失败");
          }
        })();
      });
    },
    []
  );

  // 等媒体（FileContent / ImageContent）真正上传完 OSS（remoteUrl 写回）后再 resolve。
  // 失败/超时仍 reject，由调用方决定是否继续后续动作（如发引用消息）。
  // 30s 是与主端 sendMediaAndWait 一致的兜底；正常上传一般在数秒内完成。
  const sendMediaContent = useCallback(
    async (channel: Channel, content: any) => {
      const ack = await sendContent(channel, content);

      await new Promise<void>((resolve, reject) => {
        const TIMEOUT = 30_000;
        let settled = false;

        const finish = (ok: boolean, reason?: string) => {
          if (settled) return;
          settled = true;
          WKSDK.shared().taskManager.removeListener(taskListener);
          window.clearTimeout(timer);
          if (ok) {
            resolve();
          } else {
            reject(new Error(reason || "文件上传失败"));
          }
        };

        const timer = window.setTimeout(
          () => finish(false, "文件上传超时，请稍后重试"),
          TIMEOUT
        );

        const taskListener = (task: any) => {
          const taskMessage = task?.message;
          if (!taskMessage || taskMessage.clientSeq !== ack.clientSeq) {
            return;
          }
          // TaskStatus: 1=success 3=fail
          if (task.status === 1) {
            finish(true);
          } else if (task.status === 3) {
            finish(false, "文件上传失败");
          }
        };
        WKSDK.shared().taskManager.addListener(taskListener);

        // 已上传过的媒体（如重发）远端 URL 已就位，且不会再触发 taskManager 事件，直接 resolve。
        if (content?.remoteUrl) {
          finish(true);
        }
      });

      return ack;
    },
    [sendContent]
  );

  const sendQueuedAttachments = useCallback(
    async (channel: Channel, files: File[]) => {
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          const { width, height } = await getImageDimensions(file);
          const content = new ImageContent(file, undefined, width, height);
          const name = file.name || "image";
          const dotIndex = name.lastIndexOf(".");
          content.extension = dotIndex > 0 ? name.substring(dotIndex + 1) : "";
          await sendContent(channel, content);
        } else {
          const name = file.name || "unknown";
          const dotIndex = name.lastIndexOf(".");
          const extension = dotIndex > 0 ? name.substring(dotIndex + 1) : "";
          const content = new FileContent(file, name, extension, file.size);
          await sendContent(channel, content);
        }
      }
    },
    [sendContent]
  );

  const handleSend = useCallback(
    async (text: string, incomingMention?: MentionModel) => {
      // 用 ref 而非 state 做重入保护：sendingRef 在所有 await 之前同步置位，
      // 双击 Cmd+Enter 时第二次调用会读到 true 早退
      if (!selected || sendingRef.current) return;

      const trimmedText = text.trim();
      const attachments = [...pendingAttachmentsRef.current];
      const hasText = trimmedText !== "";
      const hasAttachments = attachments.length > 0;
      const ctx = context;
      const longSelection =
        !!ctx?.selectedText && ctx.selectedText.length > LONG_QUOTE_THRESHOLD;

      if (!hasText && !hasAttachments && !longSelection) return;

      sendingRef.current = true;
      setSending(true);
      setError("");

      // 必须在所有 await 之前同步发出，保持用户手势上下文，
      // 否则 background 无法调用 chrome.sidePanel.open()
      browser.runtime
        .sendMessage({
          type: EXTENSION_MESSAGE_TYPE.requestOpenConversation,
          target: {
            channelId: selected.id,
            channelType: selected.type,
          },
        } satisfies ExtensionRuntimeMessage)
        .catch((err: unknown) =>
          console.debug("[Extension] requestOpenConversation failed:", err)
        );

      // 失败时若 composer 为空，把用户原始输入回填，避免丢字
      const restoreTextOnError = () => {
        if (hasText && !inputContextRef.current?.text?.()?.trim()) {
          window.setTimeout(() => {
            inputContextRef.current?.insertText(text);
          }, 0);
        }
      };

      const buildMentionForText = (finalText: string) => {
        let finalMention = incomingMention ? { ...incomingMention } : undefined;
        if (finalMention?.entities) {
          const prefixLength = finalText.length - trimmedText.length;
          if (prefixLength > 0) {
            finalMention.entities = finalMention.entities.map((e) => ({
              ...e,
              offset: e.offset + prefixLength,
            }));
          }
        }
        return finalMention;
      };

      try {
        const channel = new Channel(selected.id, selected.type);
        await ensureSdkConnected();

        if (hasAttachments) {
          await sendQueuedAttachments(channel, attachments);
        }

        if (longSelection) {
          // 1) 把选段写成 .md 文件，等 OSS 上传完成（remoteUrl 落地）后再继续
          const mdFile = buildSelectionMarkdownFile(ctx!);
          const fileContent = new FileContent(
            mdFile,
            mdFile.name,
            "md",
            mdFile.size
          );
          let fileAck: Awaited<ReturnType<typeof sendMediaContent>>;
          try {
            fileAck = await sendMediaContent(channel, fileContent);
          } catch (e: any) {
            setError(e?.message || "长文本附件发送失败，请重试");
            restoreTextOnError();
            return;
          }

          // 2) 用户未输入评论时，文件本身已含来源信息，无需再发引用消息
          if (!hasText) {
            // 长文本分支独立处理收尾，跳过通用 hasText 路径的引用消息步骤
          } else {
            // 3) 构造 Reply 指向刚发出的文件消息（与主端 replyToFileMessage 行为对齐）
            const reply = new Reply();
            reply.messageID = fileAck.messageID;
            reply.messageSeq = fileAck.messageSeq;
            reply.fromUID = WKApp.loginInfo.uid || "";
            reply.fromName = WKApp.loginInfo.name || "";
            // reply.content 必须是带 encode() 的 MessageContent 实例
            reply.content = fileContent;

            // 4) 引用消息正文：仅用户输入（来源已写入 md 文件首行）
            const { content: finalText, mention: parsedMention } =
              buildCmdkMessageText(trimmedText, ctx, { skipQuotedBody: true });
            const messageContent = new MessageText(finalText);

            const finalMention = parsedMention || buildMentionForText(finalText);
            if (finalMention) {
              const mention = new Mention();
              mention.all = finalMention.all;
              mention.uids = finalMention.uids;
              (mention as any).entities = finalMention.entities;
              messageContent.mention = mention;
            }
            messageContent.reply = reply;

            try {
              await sendContent(channel, messageContent);
            } catch (e: any) {
              setError(`文件已发出，但引用消息发送失败：${e?.message || ""}`);
              restoreTextOnError();
              return;
            }
          }
        } else if (hasText) {
          const { content: finalText, mention: parsedMention } =
            buildCmdkMessageText(trimmedText, ctx);
          const messageContent = new MessageText(finalText);

          const finalMention = parsedMention || buildMentionForText(finalText);
          if (finalMention) {
            const mention = new Mention();
            mention.all = finalMention.all;
            mention.uids = finalMention.uids;
            (mention as any).entities = finalMention.entities;
            messageContent.mention = mention;
          }

          await sendContent(channel, messageContent);
        }

        clearPendingAttachments();
        setComposerKey((prev) => prev + 1);
        notifyClose("sent");
      } catch (sendError: any) {
        setError(sendError?.message || "发送失败");
        restoreTextOnError();
      } finally {
        setSending(false);
        sendingRef.current = false;
      }
    },
    [
      clearPendingAttachments,
      context,
      notifyClose,
      selected,
      sendContent,
      sendMediaContent,
      sendQueuedAttachments,
      ensureSdkConnected,
    ]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // 发送进行中按 Esc 不立即关闭面板，避免长文本两步发送被半路打断丢消息
        if (sendingRef.current) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        notifyClose("escape");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [notifyClose]);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName === "BUTTON") return;
      e.preventDefault();
      // 新一轮拖拽前先把上一轮残留的监听器摘掉（理论上不会有，属于防御）
      if (dragListenersRef.current) {
        window.removeEventListener("mousemove", dragListenersRef.current.onMove);
        window.removeEventListener("mouseup", dragListenersRef.current.onUp);
        dragListenersRef.current = null;
      }
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        ox: offset.x,
        oy: offset.y,
      };
      setIsDragging(true);

      const onMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        setOffset({
          x: dragRef.current.ox + (moveEvent.clientX - dragRef.current.startX),
          y: dragRef.current.oy + (moveEvent.clientY - dragRef.current.startY),
        });
      };

      const onUp = () => {
        dragRef.current = null;
        setIsDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        dragListenersRef.current = null;
      };

      dragListenersRef.current = { onMove, onUp };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [offset.x, offset.y]
  );

  // 拖拽中卸载（例如 Escape 关面板）时兜底移除 window 上的监听器，避免泄漏
  useEffect(() => {
    return () => {
      if (dragListenersRef.current) {
        window.removeEventListener("mousemove", dragListenersRef.current.onMove);
        window.removeEventListener("mouseup", dragListenersRef.current.onUp);
        dragListenersRef.current = null;
      }
    };
  }, []);

  const handlePickerSelect = useCallback((item: ChannelPickerItem) => {
    setSelected({ id: item.channelId, type: item.channelType });
    setPickerOpen(false);
  }, []);

  const handlePickerConversationClosed = useCallback((item: ChannelPickerItem) => {
    setSelected((prev) => {
      if (
        prev &&
        prev.id === item.channelId &&
        prev.type === item.channelType
      ) {
        return null;
      }
      return prev;
    });
  }, []);

  const handleCreateGroupInCategory = useCallback(
    (categoryId: string) => {
      try {
        WKApp.endpoints.organizationalLayer(null, {
          defaultCategoryId: categoryId,
          onSuccess: () => {
            void fetchData();
          },
        });
      } catch {
        setError("创建群聊 · 环境未就绪，请稍后重试");
      }
    },
    [fetchData]
  );

  const pickerItemContextMenus = useMemo(
    () =>
      buildChannelPickerItemContextMenus({
        categories,
        refresh: () => {
          void fetchData();
        },
        confirm: (content, onOk) => {
          if (window.confirm(content)) {
            void onOk();
          }
        },
        onOpenCreateCategory: () => setCreateCategoryOpen(true),
        onConversationClosed: handlePickerConversationClosed,
      }),
    [categories, fetchData, handlePickerConversationClosed]
  );

  const pickerCategoryContextMenus = useMemo(
    () =>
      buildChannelPickerCategoryContextMenus({
        categories,
        refresh: () => {
          void fetchData();
        },
        confirm: (content, onOk) => {
          if (window.confirm(content)) {
            void onOk();
          }
        },
        onOpenCreateCategory: () => setCreateCategoryOpen(true),
        onCreateGroupInCategory: handleCreateGroupInCategory,
        onShowMessage: setError,
      }),
    [categories, fetchData, handleCreateGroupInCategory]
  );

  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // 如果 target 已从 DOM 移除（弹窗销毁），不关闭
      if (!document.documentElement.contains(target)) return;
      // 检查点击是否在面板内
      if (panelRef.current && panelRef.current.contains(target)) return;
      // 检查点击是否在 tippy 弹窗内（mention、emoji 等）
      if (
        target.closest("[data-tippy-root]") ||
        target.closest(".tippy-box") ||
        target.closest(".tippy-content")
      )
        return;
      // 检查点击是否在 emoji 面板内
      if (
        target.closest(".wk-emojitoolbar-emojipanel") ||
        target.closest(".wk-emojitoolbar")
      )
        return;
      // 检查点击是否在 portal emoji 面板内（OctoComposer portal 到 body 的表情面板）
      if (
        target.closest(".octo-composer-emoji-panel") ||
        target.closest(".octo-composer-emoji-mask")
      )
        return;
      // 真的点了空白处，关闭
      notifyClose("cancel");
    },
    [notifyClose]
  );

  if (!context) {
    return (
      <div className="octo-cmdk-center">
        <div className="octo-cmdk-loading">加载中…</div>
      </div>
    );
  }

  const app = resolveApp(context.pageUrl, context.hostname);
  const title =
    context.pageTitle.length > TITLE_DISPLAY_LIMIT
      ? `${context.pageTitle.slice(0, TITLE_DISPLAY_LIMIT)}…`
      : context.pageTitle;
  const appLabel = app.cli ? `${app.name} · ${app.cli}` : app.name;
  const quotedText = context.selectedText;
  const selectionCount = quotedText.length;
  const isLongSelection = selectionCount > LONG_QUOTE_THRESHOLD;

  const selectedThread = threads.find(
    (item) =>
      item.channelId === selected?.id && item.channelType === selected?.type
  );
  const targetIsPrivate = selectedThread?.channelType === ChannelTypePerson;
  const targetIsThread = Boolean(
    selectedThread?.parentChannelId || selectedThread?.channelType === 5
  );
  const targetGlyph = targetIsPrivate
    ? (selectedThread?.name || selected?.id || "O").slice(0, 1).toUpperCase()
    : "#";
  const imageAttachments = pendingAttachments.filter((file) =>
    file.type.startsWith("image/")
  );
  const fileAttachments = pendingAttachments.filter(
    (file) => !file.type.startsWith("image/")
  );

  const pickerChannels: ChannelPickerItem[] = threads
    .filter((item) => item.channelType !== ChannelTypePerson)
    .map((item) => ({
      channelId: item.channelId,
      channelType: item.channelType,
      name: item.name,
      categoryId: item.categoryId,
      parentChannelId: item.parentChannelId,
      unread: item.unread,
      mentionCount: item.mentionCount,
      muted: item.muted,
      lastMessageTime: item.lastMessageTime,
      isBot: item.isBot,
    }));

  const pickerPrivateChats: ChannelPickerItem[] = threads
    .filter((item) => item.channelType === ChannelTypePerson)
    .map((item) => ({
      channelId: item.channelId,
      channelType: item.channelType,
      name: item.name,
      unread: item.unread,
      mentionCount: item.mentionCount,
      muted: item.muted,
      lastMessageTime: item.lastMessageTime,
      isBot: item.isBot,
    }));

  const pickerCategories: ChannelPickerCategory[] = categories.map(
    (category) => ({
      id: category.id,
      name: category.name,
      order: category.order,
      isDefault: category.isDefault,
    })
  );

  return (
    <div className="octo-cmdk" onMouseDown={handleOverlayMouseDown}>
      <div
        ref={panelRef}
        className={`octo-cmdk-panel${isDragging ? " is-dragging" : ""}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {sending && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.78)",
              backdropFilter: "blur(2px)",
              zIndex: 999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              borderRadius: "inherit",
              fontSize: 14,
              color: "#333",
              pointerEvents: "all",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                border: "3px solid #d0d7de",
                borderTopColor: "#0969da",
                borderRadius: "50%",
                animation: "octo-cmdk-spin 0.8s linear infinite",
              }}
            />
            <div>{isLongSelection ? "正在转换为 .md 并发送…" : "发送中…"}</div>
            <style>{`@keyframes octo-cmdk-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        <div
          className={`octo-cmdk-top${isDragging ? " is-dragging" : ""}`}
          onMouseDown={onDragStart}
          title="按住可拖动浮层"
        >
          <span className="octo-cmdk-avatar">✦</span>
          <div className="octo-cmdk-title">
            <span>发送到</span>
            <strong>Octo</strong>
          </div>
          <div className="octo-cmdk-spacer" />
          <button
            className="octo-cmdk-target-chip"
            disabled={sending || loading}
            onClick={() => setPickerOpen((prev) => !prev)}
            type="button"
          >
            <span
              className={`octo-cmdk-target-glyph${
                targetIsPrivate ? " is-private" : ""
              }`}
            >
              {targetGlyph}
            </span>
            <span className="octo-cmdk-target-copy">
              <span className="octo-cmdk-target-name">
                {selectedThread?.name ||
                  (selected ? selected.id : loading ? "加载中…" : "选择发送方")}
              </span>
              {targetIsThread && (
                <span className="octo-cmdk-target-thread">Thread</span>
              )}
            </span>
            <span className="octo-cmdk-target-chevron">▾</span>
          </button>
          <button
            className="octo-cmdk-close"
            onClick={() => notifyClose("cancel")}
            disabled={sending}
            title="关闭 (Esc)"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="octo-cmdk-body">
          {quotedText && (
            <div className="octo-cmdk-quote">
              <div className="octo-cmdk-quote-meta">
                <span className="octo-cmdk-quote-favicon">{app.icon}</span>
                <span className="octo-cmdk-quote-source">{appLabel}</span>
                <span className="octo-cmdk-quote-sep">·</span>
                <span className="octo-cmdk-quote-count">
                  选中 {selectionCount} 字
                </span>
                {isLongSelection && (
                  <>
                    <span className="octo-cmdk-quote-sep">·</span>
                    <span
                      className="octo-cmdk-quote-count"
                      title={`超过 ${LONG_QUOTE_THRESHOLD} 字将作为 .md 文件发送`}
                    >
                      {sending ? "正在转换为 .md 并发送…" : "将作为 .md 文件发送"}
                    </span>
                  </>
                )}
              </div>
              <div className="octo-cmdk-quote-body">{quotedText}</div>
            </div>
          )}

          {imageAttachments.length > 0 && (
            <div className="octo-cmdk-imgs">
              {imageAttachments.map((file, index) => {
                const itemIndex = pendingAttachments.findIndex(
                  (item) => item === file
                );
                return (
                  <div
                    key={`${getFileKey(file)}-${index}`}
                    className="octo-cmdk-img"
                  >
                    <img
                      className="octo-cmdk-img-thumb"
                      src={imagePreviewUrls[getFileKey(file)]}
                      alt={file.name}
                    />
                    <button
                      className="octo-cmdk-img-x"
                      onClick={() => removePendingAttachment(itemIndex)}
                      title="移除"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {fileAttachments.length > 0 && (
            <div className="octo-cmdk-chips">
              {fileAttachments.map((file, index) => {
                const itemIndex = pendingAttachments.findIndex(
                  (item) => item === file
                );
                return (
                  <div
                    key={`${getFileKey(file)}-${index}`}
                    className="octo-cmdk-chip"
                  >
                    <span className="octo-cmdk-chip-icon">📎</span>
                    <div className="octo-cmdk-chip-meta">
                      <div className="octo-cmdk-chip-name">{file.name}</div>
                      <div className="octo-cmdk-chip-size">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                    <button
                      className="octo-cmdk-chip-rm"
                      onClick={() => removePendingAttachment(itemIndex)}
                      title="移除"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className="octo-cmdk-center">
              <div className="octo-cmdk-loading">加载会话列表…</div>
            </div>
          ) : (
            <>
              {error && <div className="octo-cmdk-composer-error">{error}</div>}

              <div className="octo-cmdk-composer-wrap">
                <OctoComposer
                  key={`${selected?.id || "__empty"}-${composerKey}`}
                  channel={
                    new Channel(
                      selected?.id || "",
                      selected?.type ?? ChannelTypePerson
                    )
                  }
                  conversationContext={mockContext}
                  contextClassName="cmdk"
                  members={members}
                  renderToolbar={true}
                  onContext={(value) => {
                    inputContextRef.current = value;
                  }}
                  onSendText={handleSend}
                  placeholder={
                    selectedThread
                      ? selectedThread.channelType === ChannelTypePerson
                        ? `发消息给 ${selectedThread.name}`
                        : `#${selectedThread.name}`
                      : "输入消息"
                  }
                />
              </div>

              {pickerOpen && (
                <div className="octo-cmdk-picker">
                  <ChannelPicker
                    channels={pickerChannels}
                    categories={pickerCategories}
                    privateChats={pickerPrivateChats}
                    selectedId={selected?.id}
                    layoutMode="single-panel"
                    onSelect={handlePickerSelect}
                    getItemContextMenus={pickerItemContextMenus}
                    getCategoryContextMenus={pickerCategoryContextMenus}
                    onClose={() => setPickerOpen(false)}
                    onRefresh={() => {
                      void fetchData();
                    }}
                    loading={loading}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateCategoryModalComponent
        visible={createCategoryOpen}
        existingNames={categories.map((category) => category.name)}
        onConfirm={async (name: string) => {
          const spaceId = WKApp.shared.currentSpaceId;
          if (!spaceId) {
            setError("未选中 Space，无法创建分组");
            return;
          }
          try {
            await CategoryService.create(spaceId, { name });
          } catch (err) {
            setError(err instanceof Error ? err.message : "创建分组失败");
            return;
          }
          setCreateCategoryOpen(false);
          try {
            await fetchData();
          } catch (err) {
            setError(err instanceof Error ? err.message : "刷新分组失败");
          }
        }}
        onCancel={() => setCreateCategoryOpen(false)}
      />
    </div>
  );
}
