import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MessageInput, {
  type MentionModel,
  type MessageInputContext,
  formatMentionTextV2,
} from '@dmwork/base/src/Components/MessageInput';
import type ConversationContext from '@dmwork/base/src/Components/Conversation/context';
import ChannelPicker from '@dmwork/base/src/Components/ChannelPicker';
import type {
  ChannelPickerItem,
  ChannelPickerCategory,
} from '@dmwork/base/src/Components/ChannelPicker';
import CategoryService from '@dmwork/base/src/Service/CategoryService';
import { MessageReasonCode } from '@dmwork/base/src/Service/Const';
import {
  WKApp,
  shouldSkipChannelForSpace,
  shouldSkipPersonConversationForSpace,
} from '@dmwork/base';
import { ImageContent } from '@dmwork/base/src/Messages/Image';
import { FileContent } from '@dmwork/base/src/Messages/File/FileContent';
import {
  Channel,
  ChannelTypePerson,
  ConnectStatus,
  Mention,
  MessageText,
  type SendackPacket,
  Setting,
  Subscriber,
  WKSDK,
} from 'wukongimjssdk';
import { resolveApp } from '../cmdk-overlay.content/url-apps';

interface PanelContext {
  selectedText: string;
  pageUrl: string;
  pageTitle: string;
  hostname: string;
}

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
}

const QUOTE_MAX_LENGTH = 500;
const TITLE_DISPLAY_LIMIT = 60;
const MAX_ATTACHMENTS = 20;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
const SEND_ACK_TIMEOUT = 12000;
const COLLAPSED_QUOTE_LENGTH = 180;
const BLOCKED_EXTENSIONS = [
  'exe',
  'bat',
  'sh',
  'cmd',
  'msi',
  'dll',
  'php',
  'jsp',
  'apk',
  'com',
  'scr',
  'pif',
  'vbs',
  'js',
  'wsf',
  'ps1',
];
const MessageInputView = MessageInput as any;

function buildCmdkMessageText(text: string, context: PanelContext | null) {
  const parts: string[] = [];
  const quotedText = context?.selectedText;

  if (quotedText) {
    const quote = quotedText.length > QUOTE_MAX_LENGTH
      ? `${quotedText.slice(0, QUOTE_MAX_LENGTH)}…`
      : quotedText;
    parts.push(`> ${quote.split('\n').join('\n> ')}`);
  }

  if (context?.pageUrl) {
    parts.push(`🔗 ${context.pageTitle || context.pageUrl}`);
  }

  parts.push(text.trim());

  return formatMentionTextV2(parts.join('\n\n'));
}

function renderSharedToolbar(context: ConversationContext) {
  const toolbars = WKApp.endpoints.chatToolbarsWithKey(context);

  return (
    <ul className="octo-cmdk-chattoolbars">
      {toolbars.map((toolbar) => (
        <li key={toolbar.sid} className="octo-cmdk-chattoolbars-item">
          {toolbar.node as any}
        </li>
      ))}
    </ul>
  );
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

function applySpaceIdToContent(content: any, channel: Channel) {
  const spaceId = WKApp.shared.currentSpaceId;
  if (!spaceId || channel.channelType !== ChannelTypePerson) {
    return;
  }

  if (typeof content.encodeJSON === 'function') {
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
      return '您已被踢出群聊';
    case MessageReasonCode.reasonNotAllowSend:
    case MessageReasonCode.reasonNotInWhitelist:
    case MessageReasonCode.reasonInBlacklist: {
      if (channel.channelType === ChannelTypePerson) {
        const channelInfo = WKSDK.shared().channelManager.getChannelInfo(channel);
        if (channelInfo?.orgData?.robot === 1) {
          return '请先添加好友后再与该机器人对话';
        }
      }
      return '你已被禁言或全员禁言';
    }
    case MessageReasonCode.reasonChannelNotExist:
      return '会话不存在';
    case MessageReasonCode.reasonAuthFail:
    case MessageReasonCode.reasonConnectKick:
    case MessageReasonCode.reasonQueryTokenError:
      return '登录状态已失效，请重新登录后再试';
    case MessageReasonCode.reasonSenderOffline:
      return '当前连接已断开，请重试';
    case MessageReasonCode.reasonSystemError:
      return '系统错误';
    default:
      return `发送失败（code: ${reasonCode}）`;
  }
}

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
}

export default function CmdKApp() {
  const [context, setContext] = useState<PanelContext | null>(null);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selected, setSelected] = useState<{ id: string; type: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [members, setMembers] = useState<Subscriber[] | undefined>(undefined);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [composerKey, setComposerKey] = useState(0);
  const [draftText, setDraftText] = useState('');
  const [quoteExpanded, setQuoteExpanded] = useState(false);
  const inputContextRef = useRef<MessageInputContext | null>(null);
  const inputDomRef = useRef<HTMLElement | null>(null);
  const inputDomListenerRef = useRef<(() => void) | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragFileCallbackRef = useRef<((file: File) => void) | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const sendingRef = useRef(false);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CMDK_OPEN') {
        setContext(e.data.context);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    setQuoteExpanded(false);
  }, [context?.selectedText, context?.pageUrl]);

  useEffect(() => {
    const nextUrls: Record<string, string> = {};

    for (const file of pendingAttachments) {
      if (!file.type.startsWith('image/')) continue;
      nextUrls[getFileKey(file)] = URL.createObjectURL(file);
    }

    setImagePreviewUrls(nextUrls);

    return () => {
      Object.values(nextUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingAttachments]);

  const addPendingAttachments = useCallback((files: File[]): string | null => {
    const current = pendingAttachments;
    const incoming = Array.from(files);

    if (current.length + incoming.length > MAX_ATTACHMENTS) {
      return `最多只能同时发送 ${MAX_ATTACHMENTS} 个文件`;
    }

    for (const file of incoming) {
      const dotIndex = file.name.lastIndexOf('.');
      const ext = dotIndex > -1 ? file.name.substring(dotIndex + 1).toLowerCase() : '';
      if (BLOCKED_EXTENSIONS.includes(ext)) {
        return `不允许发送 .${ext} 类型的文件`;
      }
    }

    const totalSize = [...current, ...incoming].reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return '所有文件总大小不能超过 100MB';
    }

    setPendingAttachments([...current, ...incoming]);
    return null;
  }, [pendingAttachments]);

  const removePendingAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const clearPendingAttachments = useCallback(() => {
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
    const channel = new Channel(selected?.id || '', selected?.type ?? ChannelTypePerson);

    return {
      sendMessage: noopAsync,
      resendMessage: noopAsync,
      scrollToBottom: noop,
      insertText: (text: string) => {
        inputContextRef.current?.insertText(text);
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
      messageInputContext: () => inputContextRef.current || fallbackInputContext,
      setDragFileCallback: (callback: (file: File) => void) => {
        dragFileCallbackRef.current = callback;
      },
      getPendingAttachments: () => pendingAttachments,
      addPendingAttachments,
      removePendingAttachment,
      clearPendingAttachments,
      fowardMessageUI: noop,
      locateMessage: noop,
      getCachedSelectedText: () => null,
    };
  }, [
    addPendingAttachments,
    clearPendingAttachments,
    pendingAttachments,
    removePendingAttachment,
    selected?.id,
    selected?.type,
  ]);

  const sharedToolbar = useMemo(() => renderSharedToolbar(mockContext), [mockContext]);

  const syncDraftText = useCallback(() => {
    window.requestAnimationFrame(() => {
      setDraftText(inputContextRef.current?.text?.() || '');
    });
  }, []);

  const handleInputRef = useCallback((node: HTMLElement | null) => {
    if (inputDomRef.current === node) {
      return;
    }

    if (inputDomRef.current && inputDomListenerRef.current) {
      inputDomRef.current.removeEventListener('input', inputDomListenerRef.current);
      inputDomRef.current.removeEventListener('keyup', inputDomListenerRef.current);
      inputDomRef.current.removeEventListener('paste', inputDomListenerRef.current);
    }

    inputDomRef.current = node;
    inputDomListenerRef.current = null;

    if (!node) {
      return;
    }

    const listener = () => {
      syncDraftText();
    };

    node.addEventListener('input', listener);
    node.addEventListener('keyup', listener);
    node.addEventListener('paste', listener);
    inputDomListenerRef.current = listener;
    syncDraftText();
  }, [syncDraftText]);

  useEffect(() => () => {
    if (inputDomRef.current && inputDomListenerRef.current) {
      inputDomRef.current.removeEventListener('input', inputDomListenerRef.current);
      inputDomRef.current.removeEventListener('keyup', inputDomListenerRef.current);
      inputDomRef.current.removeEventListener('paste', inputDomListenerRef.current);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      await WKSDK.shared().conversationManager.sync({});
      const conversations = WKSDK.shared().conversationManager.conversations;
      const spaceId = WKApp.shared.currentSpaceId;

      let categoryItems: Array<{
        category_id: string | null;
        name: string;
        sort: number;
        groups: Array<{ group_no: string }>;
      }> = [];

      if (spaceId) {
        try {
          categoryItems = await CategoryService.list(spaceId);
        } catch (categoryError) {
          console.warn('[CmdKApp] Failed to load categories:', categoryError);
        }
      }

      const pickerCategories: CategoryItem[] = categoryItems.map((category, index) => ({
        id: category.category_id || `default-${index}`,
        name: category.name === '未分类' ? '默认分组' : category.name,
        order: category.sort ?? index,
      }));

      const groupCategoryMap = new Map<string, string>();
      for (let categoryIndex = 0; categoryIndex < categoryItems.length; categoryIndex += 1) {
        const category = categoryItems[categoryIndex];
        const categoryId = category.category_id || `default-${categoryIndex}`;
        for (const group of category.groups || []) {
          groupCategoryMap.set(group.group_no, categoryId);
        }
      }

      const uncachedChannels = conversations
        .filter((conversation) => !WKSDK.shared().channelManager.getChannelInfo(conversation.channel))
        .map((conversation) => conversation.channel);

      if (uncachedChannels.length > 0) {
        await Promise.all(
          uncachedChannels.map((channel) =>
            WKSDK.shared().channelManager.fetchChannelInfo(channel).catch(() => null),
          ),
        );
      }

      const channelList: ThreadItem[] = [];
      const privateChatList: ThreadItem[] = [];

      for (const conversation of conversations) {
        if (shouldSkipChannelForSpace(conversation.channel)) continue;
        if (shouldSkipPersonConversationForSpace(conversation)) continue;

        const channelInfo = WKSDK.shared().channelManager.getChannelInfo(conversation.channel);
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
          mentionCount: conversation.reminders?.filter((reminder) => !reminder.done).length ?? 0,
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

      const nextThreads = [...channelList, ...privateChatList];
      setThreads(nextThreads);
      setCategories(pickerCategories);
      setSelected((prev) => {
        if (prev && nextThreads.some((item) => item.channelId === prev.id && item.channelType === prev.type)) {
          return prev;
        }
        const first = nextThreads[0];
        return first ? { id: first.channelId, type: first.channelType } : null;
      });
    } catch (fetchError: any) {
      setError(fetchError?.message || '获取会话失败');
      setThreads([]);
      setCategories([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (context) {
      void fetchData();
    }
  }, [context, fetchData]);

  useEffect(() => {
    if (!selected || selected.type === ChannelTypePerson) {
      setMembers(undefined);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const apiURL = WKApp.apiClient.config.apiURL;
        const token = WKApp.loginInfo.token;
        const response = await fetch(
          `${apiURL}groups/${encodeURIComponent(selected.id)}/members?limit=1000`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              token: token || '',
            },
          },
        );

        if (!cancelled && response.ok) {
          const data = await response.json();
          setMembers(
            (data || []).map((member: { uid: string; name: string }) => {
              const subscriber = new Subscriber();
              subscriber.uid = member.uid;
              subscriber.name = member.name;
              return subscriber;
            }),
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
    window.parent.postMessage({ type: 'CMDK_CLOSE', reason }, '*');
  }, []);

  const ensureSdkConnected = useCallback(async () => {
    if (WKSDK.shared().connectManager.status === ConnectStatus.Connected) {
      return;
    }

    if (!WKApp.loginInfo.isLogined()) {
      throw new Error('未登录');
    }

    WKApp.shared.connectIM();

    await new Promise<void>((resolve, reject) => {
      if (WKSDK.shared().connectManager.status === ConnectStatus.Connected) {
        resolve();
        return;
      }

      const timeoutId = window.setTimeout(() => {
        WKSDK.shared().connectManager.removeConnectStatusListener(listener);
        reject(new Error('IM 连接超时'));
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
          reject(new Error('IM 认证失败'));
        }
      };

      WKSDK.shared().connectManager.addConnectStatusListener(listener);
    });
  }, []);

  const sendContent = useCallback(async (channel: Channel, content: any) => {
    applySpaceIdToContent(content, channel);

    const channelInfo = WKSDK.shared().channelManager.getChannelInfo(channel);
    const setting = new Setting();
    if (channelInfo?.orgData?.receipt === 1) {
      setting.receiptEnabled = true;
    }

    await new Promise<void>((resolve, reject) => {
      let targetClientSeq: number | null = null;
      const pendingAcks: SendackPacket[] = [];
      let settled = false;

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        WKSDK.shared().chatManager.removeMessageStatusListener(listener);
      };

      const settleSuccess = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const settleFailure = (message: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(message));
      };

      const consumeAck = (ackPacket: SendackPacket) => {
        if (ackPacket.reasonCode === MessageReasonCode.reasonSuccess) {
          settleSuccess();
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
        settleFailure('消息发送超时，请稍后重试');
      }, SEND_ACK_TIMEOUT);

      WKSDK.shared().chatManager.addMessageStatusListener(listener);

      void (async () => {
        try {
          const message = await WKSDK.shared().chatManager.send(content, channel, setting);
          targetClientSeq = message.clientSeq;

          const matchedAck = pendingAcks.find((ackPacket) => ackPacket.clientSeq === targetClientSeq);
          if (matchedAck) {
            consumeAck(matchedAck);
          }
        } catch (sendError: any) {
          settleFailure(sendError?.message || '发送失败');
        }
      })();
    });
  }, []);

  const sendQueuedAttachments = useCallback(async (channel: Channel, files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const { width, height } = await getImageDimensions(file);
        const content = new ImageContent(file, undefined, width, height);
        const name = file.name || 'image';
        const dotIndex = name.lastIndexOf('.');
        content.extension = dotIndex > 0 ? name.substring(dotIndex + 1) : '';
        await sendContent(channel, content);
      } else {
        const name = file.name || 'unknown';
        const dotIndex = name.lastIndexOf('.');
        const extension = dotIndex > 0 ? name.substring(dotIndex + 1) : '';
        const content = new FileContent(file, name, extension, file.size);
        await sendContent(channel, content);
      }
    }
  }, [sendContent]);

  const handleSend = useCallback(async (text: string, incomingMention?: MentionModel) => {
    if (!selected || sendingRef.current) return;

    const trimmedText = text.trim();
    const attachments = [...pendingAttachments];
    const hasText = trimmedText !== '';
    const hasAttachments = attachments.length > 0;

    if (!hasText && !hasAttachments) return;

    sendingRef.current = true;
    setSending(true);
    setError('');

    try {
      const channel = new Channel(selected.id, selected.type);
      await ensureSdkConnected();

      if (hasAttachments) {
        await sendQueuedAttachments(channel, attachments);
      }

      if (hasText) {
        const { content: finalText, mention: parsedMention } = buildCmdkMessageText(trimmedText, context);
        const messageContent = new MessageText(finalText);

        // When sent via Enter key, MessageInput pre-formats the text to
        // "@name" (not "@[uid:name]") and passes the mention data as the
        // second argument.  buildCmdkMessageText cannot re-parse mentions
        // from the already-formatted text, so parsedMention will be
        // undefined.  Fall back to the incoming mention and adjust entity
        // offsets for any quote/link prefix that was prepended.
        let finalMention = parsedMention;
        if (!finalMention && incomingMention) {
          const prefixLength = finalText.length - trimmedText.length;
          finalMention = { ...incomingMention };
          if (finalMention.entities && prefixLength > 0) {
            finalMention.entities = finalMention.entities.map((e) => ({
              ...e,
              offset: e.offset + prefixLength,
            }));
          }
        }

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
      setDraftText('');
      setComposerKey((prev) => prev + 1);
      notifyClose('sent');
    } catch (sendError: any) {
      setError(sendError?.message || '发送失败');
      if (hasText && !inputContextRef.current?.text?.()?.trim()) {
        window.setTimeout(() => {
          inputContextRef.current?.insertText(text);
          syncDraftText();
        }, 0);
      }
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  }, [
    clearPendingAttachments,
    context,
    notifyClose,
    pendingAttachments,
    selected,
    sendContent,
    sendQueuedAttachments,
    ensureSdkConnected,
    syncDraftText,
  ]);

  const handleTriggerSend = useCallback(() => {
    void handleSend(inputContextRef.current?.text?.() || '');
  }, [handleSend]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        notifyClose('escape');
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [notifyClose]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
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
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [offset.x, offset.y]);

  const handlePickerSelect = useCallback((item: ChannelPickerItem) => {
    setSelected({ id: item.channelId, type: item.channelType });
    setPickerOpen(false);
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // 检查点击是否在面板内
    if (panelRef.current && panelRef.current.contains(target)) return;
    // 检查点击是否在 tippy 弹窗内（mention、emoji 等）
    if (target.closest('[data-tippy-root]') || target.closest('.tippy-box') || target.closest('.tippy-content')) return;
    // 检查点击是否在 emoji 面板内
    if (target.closest('.wk-emojitoolbar-emojipanel') || target.closest('.wk-emojitoolbar')) return;
    // 真的点了空白处，关闭
    notifyClose('cancel');
  }, [notifyClose]);

  if (!context) {
    return (
      <div className="octo-cmdk-center">
        <div className="octo-cmdk-loading">加载中…</div>
      </div>
    );
  }

  const app = resolveApp(context.pageUrl, context.hostname);
  const title = context.pageTitle.length > TITLE_DISPLAY_LIMIT
    ? `${context.pageTitle.slice(0, TITLE_DISPLAY_LIMIT)}…`
    : context.pageTitle;
  const appLabel = app.cli ? `${app.name} · ${app.cli}` : app.name;
  const quotedText = context.selectedText;
  const collapsedPreview = quotedText.length > COLLAPSED_QUOTE_LENGTH
    ? `${quotedText.slice(0, COLLAPSED_QUOTE_LENGTH)}…`
    : quotedText;
  const preview = quoteExpanded ? quotedText : collapsedPreview;
  const isTruncated = quotedText.length > COLLAPSED_QUOTE_LENGTH;
  const selectionCount = quotedText.length;

  const selectedThread = threads.find(
    (item) => item.channelId === selected?.id && item.channelType === selected?.type,
  );
  const targetIsPrivate = selectedThread?.channelType === ChannelTypePerson;
  const targetIsThread = Boolean(selectedThread?.parentChannelId || selectedThread?.channelType === 5);
  const targetGlyph = targetIsPrivate
    ? (selectedThread?.name || selected?.id || 'O').slice(0, 1).toUpperCase()
    : '#';
  const imageAttachments = pendingAttachments.filter((file) => file.type.startsWith('image/'));
  const fileAttachments = pendingAttachments.filter((file) => !file.type.startsWith('image/'));
  const canSend = Boolean(selected) && !sending && (pendingAttachments.length > 0 || draftText.trim() !== '');

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

  const pickerCategories: ChannelPickerCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    order: category.order,
  }));

  return (
    <div className="octo-cmdk" onClick={handleOverlayClick}>
      <div
        ref={panelRef}
        className={`octo-cmdk-panel${isDragging ? ' is-dragging' : ''}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <div
          className={`octo-cmdk-top${isDragging ? ' is-dragging' : ''}`}
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
            <span className={`octo-cmdk-target-glyph${targetIsPrivate ? ' is-private' : ''}`}>{targetGlyph}</span>
            <span className="octo-cmdk-target-copy">
              <span className="octo-cmdk-target-name">
                {selectedThread?.name || (selected ? selected.id : (loading ? '加载中…' : '选择发送方'))}
              </span>
              {targetIsThread && <span className="octo-cmdk-target-thread">Thread</span>}
            </span>
            <span className="octo-cmdk-target-chevron">▾</span>
          </button>
          <button className="octo-cmdk-close" onClick={() => notifyClose('cancel')} title="关闭 (Esc)" type="button">×</button>
        </div>

        <div className="octo-cmdk-body">
          {quotedText && (
            <div className={`octo-cmdk-quote${quoteExpanded ? ' is-expanded' : ''}`}>
              <div className="octo-cmdk-quote-meta">
                <span className="octo-cmdk-quote-favicon">{app.icon}</span>
                <span className="octo-cmdk-quote-source">{appLabel}</span>
                <span className="octo-cmdk-quote-sep">·</span>
                <span className="octo-cmdk-quote-count">选中 {selectionCount} 字</span>
              </div>
              <div className="octo-cmdk-quote-body">{preview}</div>
              {isTruncated && (
                <button
                  className="octo-cmdk-quote-expand"
                  onClick={() => setQuoteExpanded((prev) => !prev)}
                  type="button"
                >
                  {quoteExpanded ? '收起' : '展开'}
                </button>
              )}
            </div>
          )}

          {imageAttachments.length > 0 && (
            <div className="octo-cmdk-imgs">
              {imageAttachments.map((file, index) => {
                const itemIndex = pendingAttachments.findIndex((item) => item === file);
                return (
                  <div key={`${getFileKey(file)}-${index}`} className="octo-cmdk-img">
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
                const itemIndex = pendingAttachments.findIndex((item) => item === file);
                return (
                  <div key={`${getFileKey(file)}-${index}`} className="octo-cmdk-chip">
                    <span className="octo-cmdk-chip-icon">📎</span>
                    <div className="octo-cmdk-chip-meta">
                      <div className="octo-cmdk-chip-name">{file.name}</div>
                      <div className="octo-cmdk-chip-size">{formatFileSize(file.size)}</div>
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
            <div className="octo-cmdk-center"><div className="octo-cmdk-loading">加载会话列表…</div></div>
          ) : (
            <>
              <div className="octo-cmdk-composer">
                <div className="octo-cmdk-source-info">
                  <div className="octo-cmdk-source-title">{title}</div>
                  <div className="octo-cmdk-source-url">{appLabel}</div>
                </div>

                <MessageInputView
                  key={`${selected?.id || '__empty'}-${composerKey}`}
                  context={mockContext}
                  onSend={handleSend}
                  members={members}
                  hasPendingAttachments={pendingAttachments.length > 0}
                  onContext={(value: MessageInputContext) => {
                    inputContextRef.current = value;
                    setDraftText(value.text?.() || '');
                  }}
                  onInputRef={handleInputRef}
                />
              </div>

              <div className="octo-cmdk-foot">
                {error && <span className="octo-cmdk-err">{error}</span>}
                <div className="octo-cmdk-tools">{sharedToolbar}</div>
                <div className="octo-cmdk-hint">
                  <span className="octo-cmdk-kbd">ESC</span>
                  <span>关闭</span>
                </div>
                <button
                  className={`octo-cmdk-send-plane${canSend ? ' is-active' : ''}${sending ? ' is-sending' : ''}`}
                  disabled={!canSend}
                  title="发送"
                  onClick={handleTriggerSend}
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>

              {pickerOpen && (
                <div className="octo-cmdk-picker">
                  <ChannelPicker
                    channels={pickerChannels}
                    categories={pickerCategories}
                    privateChats={pickerPrivateChats}
                    selectedId={selected?.id}
                    onSelect={handlePickerSelect}
                    onClose={() => setPickerOpen(false)}
                    onRefresh={() => { void fetchData(); }}
                    loading={loading}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
