import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapMention from "@tiptap/extension-mention";
import {
  Channel,
  ChannelTypePerson,
  MediaMessageContent,
  Mention,
  MessageContentType,
  MessageTask,
  MessageText,
  Reply,
  Subscriber,
  TaskStatus,
  WKSDK,
} from "wukongimjssdk";
import { WKApp } from "@dmwork/base";
import type ConversationContext from "@dmwork/base/src/Components/Conversation/context";
import {
  formatMentionTextV2,
  type MentionModel,
  type MessageInputContext,
} from "@dmwork/base/src/Components/MessageInput";
import { createMentionSuggestion } from "@dmwork/base/src/Components/MessageInput/mentionSuggestion";
import SlashCommandMenu, {
  type BotCommand,
} from "@dmwork/base/src/Components/SlashCommandMenu";
import { EmojiPanel } from "@dmwork/base/src/Components/EmojiToolbar";
import { FileContent } from "@dmwork/base/src/Messages/File";
import { ImageContent } from "@dmwork/base/src/Messages/Image";
import { LottieSticker } from "@dmwork/base/src/Messages/LottieSticker";
import { showToast } from "./OctoToast";
import { formatFileSize, getImageDimensions } from "../../utils/attachment";

const MAX_MESSAGE_LENGTH = 2000;
const INVISIBLE_CHARS_RE =
  /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064\u034F\u061C\u180E]/g;

function stripInvisibleChars(text: string): string {
  return text.replace(INVISIBLE_CHARS_RE, "");
}

// 按 contextClassName 隔离的草稿快照：sidepanel 与 cmdk 同时存在时各自保留，不会串味
const persistentEditorJSONByContext = new Map<string, any>();
const persistentPlainTextByContext = new Map<string, string>();

function getPersistentKey(contextClassName?: string): string {
  return contextClassName ?? "default";
}

function extractMentionsFromEditor(editor: any): string {
  const json = editor.getJSON();
  let result = "";

  function traverse(node: any) {
    if (node.type === "text") {
      result += node.text;
    } else if (node.type === "mention") {
      if (node.attrs.invalid) {
        result += `@${node.attrs.label}`;
      } else {
        result += `@[${node.attrs.id}:${node.attrs.label}]`;
      }
    } else if (node.type === "hardBreak") {
      result += "\n";
    } else if (node.content) {
      node.content.forEach(traverse);
    }
  }

  if (json.content) {
    json.content.forEach((block: any, index: number) => {
      if (index > 0) {
        result += "\n";
      }
      traverse(block);
    });
  }

  return stripInvisibleChars(result);
}

function getAttachmentBadge(file: File): string {
  if (file.type.startsWith("image/")) {
    return "IMG";
  }
  const dotIndex = file.name.lastIndexOf(".");
  if (dotIndex > 0) {
    return file.name
      .substring(dotIndex + 1)
      .toUpperCase()
      .slice(0, 4);
  }
  return "FILE";
}

function parseBotCommands(channel: Channel): BotCommand[] | undefined {
  if (channel.channelType !== ChannelTypePerson) {
    return undefined;
  }

  const channelInfo = WKSDK.shared().channelManager.getChannelInfo(channel);
  if (channelInfo?.orgData?.robot !== 1 || !channelInfo.orgData.bot_commands) {
    return undefined;
  }

  try {
    const raw =
      typeof channelInfo.orgData.bot_commands === "string"
        ? JSON.parse(channelInfo.orgData.bot_commands)
        : channelInfo.orgData.bot_commands;
    return Array.isArray(raw) ? (raw as BotCommand[]) : undefined;
  } catch {
    return undefined;
  }
}

async function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

export interface OctoComposerStickerArgs {
  category: string;
  path: string;
  placeholder: string;
  format: string;
}

export interface OctoComposerContext extends MessageInputContext {
  plainText(): string;
  setPlainText(text: string): void;
  send(overrideText?: string): Promise<void>;
  openFilePicker(): void;
  triggerMention(): void;
  triggerExpand(): void;
  insertEmoji(emoji: { key: string }): void;
  insertSticker(sticker: OctoComposerStickerArgs): Promise<void>;
}

interface OctoComposerProps {
  channel: Channel;
  conversationContext: ConversationContext;
  onExpand?: (text: string) => void;
  onContext?: (ctx: OctoComposerContext) => void;
  onPlainTextChange?: (text: string) => void;
  onSendText?: (text: string, mention?: MentionModel) => Promise<void>;
  placeholder?: string;
  members?: Subscriber[];
  contextClassName?: "sidepanel" | "cmdk";
  renderToolbar?: boolean;
}

const EditorContentView = EditorContent as any;
const EmojiPanelComponent = EmojiPanel as any;
const SlashCommandMenuComponent = SlashCommandMenu as any;

const COMPOSER_ICONS = {
  emoji: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </>
  ),
  at: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
    </>
  ),
  attach: (
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  ),
  expand: (
    <>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </>
  ),
  send: (
    <>
      <path d="M3.5 11.5L20 4l-3.5 16.5-5-7z" />
      <path d="M11.5 13.5L20 4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
} as const;

function ComposerIcon({
  path,
  className,
}: {
  path: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

const OctoComposer: React.FC<OctoComposerProps> = ({
  channel,
  conversationContext,
  onExpand,
  onContext,
  onPlainTextChange,
  onSendText,
  placeholder,
  members: membersProp,
  contextClassName = "sidepanel",
  renderToolbar = true,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiPanelRef = useRef<HTMLDivElement | null>(null);
  const mentionActiveRef = useRef(false);
  const editorHandleKeyDownRef = useRef<
    ((view: any, event: KeyboardEvent) => boolean) | null
  >(null);
  const persistentKey = getPersistentKey(contextClassName);
  const [plainText, setPlainText] = useState(
    () => persistentPlainTextByContext.get(persistentKey) ?? ""
  );
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  // sidepanel 下 MessageInput 并未挂载，Conversation._addAttachmentFn 始终为 undefined，
  // 因此附件由 OctoComposer 自己存；ref 供 composerContext.getAttachmentFiles 与 send 读取当前值
  const pendingAttachmentsRef = useRef<File[]>([]);
  const updatePendingAttachments = useCallback(
    (updater: File[] | ((prev: File[]) => File[])) => {
      setPendingAttachments((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        pendingAttachmentsRef.current = next;
        return next;
      });
    },
    []
  );
  const [members, setMembers] = useState<Subscriber[]>([]);
  const membersRef = useRef<Subscriber[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [slashMenuVisible, setSlashMenuVisible] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const botCommands = useMemo(
    () => parseBotCommands(channel),
    [channel.channelID, channel.channelType]
  );

  const syncPendingAttachments = useCallback(() => {
    setPendingAttachments([...conversationContext.getPendingAttachments()]);
  }, [conversationContext]);

  const syncMembers = useCallback(() => {
    if (membersProp) {
      const filtered = membersProp.filter((member) => member.uid !== WKApp.loginInfo.uid);
      setMembers(filtered);
      membersRef.current = filtered;
      return;
    }
    const contextMembers = (((conversationContext as any).vm?.subscribers as
      | Subscriber[]
      | undefined) ||
      WKSDK.shared().channelManager.getSubscribes(channel) ||
      []) as Subscriber[];
    const filtered = contextMembers.filter((member) => member.uid !== WKApp.loginInfo.uid);
    setMembers(filtered);
    membersRef.current = filtered;
  }, [channel, conversationContext, membersProp]);

  const sendMediaAndWait = useCallback(
    async (content: MediaMessageContent) => {
      const message = await conversationContext.sendMessage(content);
      if (!content.file) {
        return;
      }

      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(done, 30000);
        let settled = false;

        function done() {
          if (settled) return;
          settled = true;
          WKSDK.shared().taskManager.removeListener(listener);
          window.clearTimeout(timeout);
          resolve();
        }

        function listener(task: any) {
          if (
            task instanceof MessageTask &&
            task.message.clientSeq === message.clientSeq &&
            (task.status === TaskStatus.success ||
              task.status === TaskStatus.fail)
          ) {
            done();
          }
        }

        WKSDK.shared().taskManager.addListener(listener);
      });
    },
    [conversationContext]
  );

  const getFilteredSlashCommands = useCallback((): BotCommand[] => {
    if (!botCommands) return [];
    if (!slashFilter) return botCommands;
    const lower = slashFilter.toLowerCase();
    return botCommands.filter(
      (cmd) =>
        cmd.command.toLowerCase().includes(lower) ||
        cmd.description.toLowerCase().includes(lower)
    );
  }, [botCommands, slashFilter]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        code: false,
        heading: false,
        blockquote: false,
        horizontalRule: false,
        codeBlock: false,
        strike: false,
      }),
      TiptapMention.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            invalid: {
              default: false,
              parseHTML: (el) =>
                (el as HTMLElement).getAttribute("data-invalid") === "true",
              renderHTML: (attrs: Record<string, any>) =>
                attrs.invalid
                  ? { class: "is-invalid", "data-invalid": "true" }
                  : {},
            },
          };
        },
      }).configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: createMentionSuggestion(
          ({ query }) => {
            const source = membersRef.current.length
              ? membersRef.current
              : ((conversationContext as any).vm?.subscribers as
                  | Subscriber[]
                  | undefined) || [];

            const items = source
              .filter((member) => member.uid !== WKApp.loginInfo.uid)
              .map((member) => ({
                uid: member.uid,
                name: member.name,
                icon: WKApp.shared.avatarUser(member.uid),
                isBot:
                  WKSDK.shared().channelManager.getChannelInfo(
                    new Channel(member.uid, ChannelTypePerson)
                  )?.orgData?.robot === 1,
              }));

            const allItems = [
              {
                uid: "-1",
                name: "所有人",
                icon: "",
                isBot: false,
              },
              ...items,
            ];

            return allItems.filter((item) =>
              item.name.toLowerCase().includes(query.toLowerCase())
            );
          },
          (active) => {
            mentionActiveRef.current = active;
          },
          {
            appendTo: () => contextClassName === 'cmdk' ? document.body : (rootRef.current || document.body),
          }
        ),
        renderLabel({ node }) {
          return `@${node.attrs.label}`;
        },
      }),
    ],
    content: persistentEditorJSONByContext.get(persistentKey) ?? "",
    editorProps: {
      attributes: {
        "data-placeholder": "输入消息…",
      },
      handleKeyDown: (_view, event) =>
        editorHandleKeyDownRef.current?.(_view, event) ?? false,
    },
    onUpdate: ({ editor: nextEditor }) => {
      const nextText = stripInvisibleChars(nextEditor.getText());
      setPlainText(nextText);
      persistentPlainTextByContext.set(persistentKey, nextText);
      persistentEditorJSONByContext.set(persistentKey, nextEditor.getJSON());

      if (
        botCommands &&
        nextText.startsWith("/") &&
        !nextText.includes(" ") &&
        !nextText.includes("\n")
      ) {
        setSlashMenuVisible(true);
        setSlashFilter(nextText.slice(1));
        setSlashActiveIndex(0);
      } else {
        setSlashMenuVisible(false);
        setSlashFilter("");
        setSlashActiveIndex(0);
      }
    },
  });

  const applyPlainText = useCallback(
    (text: string) => {
      if (!editor) return;
      const blocks = text.split("\n").map((line) => ({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      }));
      editor.commands.setContent({
        type: "doc",
        content: blocks.length > 0 ? blocks : [{ type: "paragraph" }],
      });
      editor.commands.focus("end");
    },
    [editor]
  );

  const send = useCallback(
    async (overrideText?: string) => {
      if (sending) return;

      const currentPlainText =
        overrideText !== undefined
          ? stripInvisibleChars(overrideText)
          : plainText;
      if (
        currentPlainText.length > MAX_MESSAGE_LENGTH &&
        currentPlainText.trim().length > 0
      ) {
        showToast(`输入内容不能超过 ${MAX_MESSAGE_LENGTH} 字`);
        return;
      }

      const hasText = currentPlainText.trim().length > 0;
      const attachments = [...pendingAttachmentsRef.current];
      if (!hasText && attachments.length === 0) {
        return;
      }

      setSending(true);
      try {
        let textToSend = currentPlainText;
        let mentionModel: MentionModel | undefined;

        if (overrideText === undefined && editor) {
          const formattedText = extractMentionsFromEditor(editor);
          const formatted = formatMentionTextV2(formattedText);
          textToSend = formatted.content;
          mentionModel = formatted.mention;
        }

        if (onSendText) {
          await onSendText(textToSend, mentionModel);
          if (editor) {
            editor.commands.clearContent();
          }
          setPlainText("");
          persistentPlainTextByContext.delete(persistentKey);
          persistentEditorJSONByContext.delete(persistentKey);
          setEmojiOpen(false);
          return;
        }

        const vm = (conversationContext as any).vm;
        const content = new MessageText(textToSend);

        if (mentionModel) {
          const mention = new Mention();
          mention.all = mentionModel.all;
          mention.uids = mentionModel.uids;
          (mention as any).entities = mentionModel.entities;
          content.mention = mention;
        }

        if (vm?.currentReplyMessage) {
          if (vm.currentHandlerType === 2) {
            const json = content.encodeJSON();
            json.type = MessageContentType.text;
            await conversationContext.editMessage(
              vm.currentReplyMessage.messageID,
              vm.currentReplyMessage.messageSeq,
              vm.currentReplyMessage.channel.channelID,
              vm.currentReplyMessage.channel.channelType,
              JSON.stringify(json)
            );
            vm.currentReplyMessage = undefined;
            if (editor) {
              editor.commands.clearContent();
            }
            setPlainText("");
            persistentPlainTextByContext.delete(persistentKey);
            persistentEditorJSONByContext.delete(persistentKey);
            return;
          }

          const reply = new Reply();
          reply.messageID = vm.currentReplyMessage.messageID;
          reply.messageSeq = vm.currentReplyMessage.messageSeq;
          reply.fromUID = vm.currentReplyMessage.fromUID;
          const replyChannelInfo = WKSDK.shared().channelManager.getChannelInfo(
            new Channel(vm.currentReplyMessage.fromUID, ChannelTypePerson)
          );
          if (replyChannelInfo) {
            reply.fromName = replyChannelInfo.title;
          }
          reply.content = vm.currentReplyMessage.content;
          content.reply = reply;
          vm.currentReplyMessage = undefined;
        }

        if (attachments.length > 0) {
          updatePendingAttachments([]);

          for (const file of attachments) {
            try {
              if (file.type.startsWith("image/")) {
                const previewUrl = await readAsDataUrl(file);
                if (!previewUrl) {
                  showToast(`图片「${file.name}」读取失败`);
                  continue;
                }

                const { width, height } = await getImageDimensions(file);
                await sendMediaAndWait(
                  new ImageContent(
                    file,
                    previewUrl,
                    width,
                    height
                  ) as MediaMessageContent
                );
                continue;
              }

              const name = file.name || "unknown";
              const dotIndex = name.lastIndexOf(".");
              const ext = dotIndex > 0 ? name.substring(dotIndex + 1) : "";
              await sendMediaAndWait(
                new FileContent(
                  file,
                  name,
                  ext,
                  file.size
                ) as MediaMessageContent
              );
            } catch {
              showToast(`文件「${file.name}」发送失败`);
            }
          }
        }

        if (hasText) {
          await conversationContext.sendMessage(content);
        }

        if (editor) {
          editor.commands.clearContent();
        }
        setPlainText("");
        persistentPlainTextByContext.delete(persistentKey);
        persistentEditorJSONByContext.delete(persistentKey);
        setEmojiOpen(false);
      } finally {
        setSending(false);
      }
    },
    [
      conversationContext,
      editor,
      onSendText,
      plainText,
      sending,
      sendMediaAndWait,
      updatePendingAttachments,
    ]
  );

  const handleSlashSelect = useCallback(
    (cmd: BotCommand) => {
      if (!editor) return;
      editor.commands.setContent(
        `${cmd.command.startsWith("/") ? cmd.command : `/${cmd.command}`} `
      );
      setSlashMenuVisible(false);
      setSlashFilter("");
      setSlashActiveIndex(0);
      editor.commands.focus();
    },
    [editor]
  );

  useEffect(() => {
    editorHandleKeyDownRef.current = (_view: any, event: KeyboardEvent) => {
      if (emojiOpen && event.key === "Escape") {
        setEmojiOpen(false);
        return true;
      }

      if (slashMenuVisible) {
        const filtered = getFilteredSlashCommands();
        if (event.key === "Escape") {
          setSlashMenuVisible(false);
          return true;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSlashActiveIndex(
            (prev) => (prev + 1) % Math.max(1, filtered.length)
          );
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSlashActiveIndex(
            (prev) =>
              (prev - 1 + Math.max(1, filtered.length)) %
              Math.max(1, filtered.length)
          );
          return true;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          if (filtered.length > 0) {
            handleSlashSelect(filtered[slashActiveIndex]);
          } else {
            void send();
          }
          return true;
        }
      }

      if (event.key === "Enter" && !event.shiftKey) {
        if (mentionActiveRef.current) return false;
        event.preventDefault();
        void send();
        return true;
      }

      return false;
    };
  }, [
    emojiOpen,
    getFilteredSlashCommands,
    handleSlashSelect,
    send,
    slashActiveIndex,
    slashMenuVisible,
  ]);

  useEffect(() => {
    syncPendingAttachments();
    syncMembers();
  }, [syncMembers, syncPendingAttachments]);

  useEffect(() => {
    // 优先走订阅：不再覆写 context 的方法，避免多次 re-render / cleanup 顺序错位时
    // 把陌生实例上的 originalAdd 写回别的 instance（reviewer 第二轮非阻塞条）。
    // 旧 context（或 mock）没实现订阅时，退回到原来的 monkey-patch 方案，
    // 并把被覆写的 context 快照到本地，保证 cleanup 只还原自己的那个实例。
    const ctx = conversationContext;
    if (typeof ctx.subscribePendingAttachmentsChange === "function") {
      const unsubscribe = ctx.subscribePendingAttachmentsChange(() => {
        syncPendingAttachments();
      });
      return unsubscribe;
    }

    const originalAdd = ctx.addPendingAttachments.bind(ctx);
    const originalRemove = ctx.removePendingAttachment.bind(ctx);
    const originalClear = ctx.clearPendingAttachments.bind(ctx);

    ctx.addPendingAttachments = (files: File[]) => {
      const result = originalAdd(files);
      syncPendingAttachments();
      return result;
    };
    ctx.removePendingAttachment = (index: number) => {
      originalRemove(index);
      syncPendingAttachments();
    };
    ctx.clearPendingAttachments = () => {
      originalClear();
      syncPendingAttachments();
    };

    return () => {
      // 用本地 ctx 快照而不是闭包外的 conversationContext，杜绝 prop 换实例后
      // 还原到错的实例上；即便 React 的 cleanup 顺序按预期执行，也更清晰
      ctx.addPendingAttachments = originalAdd;
      ctx.removePendingAttachment = originalRemove;
      ctx.clearPendingAttachments = originalClear;
    };
  }, [conversationContext, syncPendingAttachments]);

  useEffect(() => {
    const listener = () => {
      syncMembers();
    };

    WKSDK.shared().channelManager.addSubscriberChangeListener(listener);
    return () => {
      WKSDK.shared().channelManager.removeSubscriberChangeListener(listener);
    };
  }, [syncMembers]);

  useEffect(() => {
    if (!editor) return;
    const validUids = new Set<string>(members.map((m) => m.uid));
    validUids.add("-1");
    if (WKApp.loginInfo.uid) {
      validUids.add(WKApp.loginInfo.uid);
    }

    const { doc } = editor.state;
    const tr = editor.state.tr;
    let mutated = false;
    doc.descendants((node, pos) => {
      if (node.type.name !== "mention") return;
      const shouldBeInvalid = !validUids.has(node.attrs.id);
      if (!!node.attrs.invalid !== shouldBeInvalid) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          invalid: shouldBeInvalid,
        });
        mutated = true;
      }
    });
    if (mutated) {
      tr.setMeta("addToHistory", false);
      editor.view.dispatch(tr);
    }
  }, [editor, channel.channelID, channel.channelType, members]);

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...(editor.options.editorProps?.attributes || {}),
          "data-placeholder": placeholder || "输入消息",
        },
      },
    });
  }, [editor, placeholder]);

  useEffect(() => {
    onPlainTextChange?.(plainText);
  }, [onPlainTextChange, plainText]);

  useEffect(() => {
    if (!editor) return;
    const node = editor.view.dom as HTMLElement;

    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []);
      const images = files.filter((file) => file.type.startsWith("image/"));
      if (images.length === 0) {
        return;
      }
      event.preventDefault();
      const error = conversationContext.addPendingAttachments(images);
      if (error) {
        showToast(error);
      }
    };

    node.addEventListener("paste", handlePaste);
    return () => {
      node.removeEventListener("paste", handlePaste);
    };
  }, [conversationContext, editor, updatePendingAttachments]);

  useEffect(() => {
    if (!emojiOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        emojiPanelRef.current?.contains(target) === false &&
        emojiButtonRef.current?.contains(target) === false
      ) {
        setEmojiOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [emojiOpen]);

  const composerContext = useMemo<OctoComposerContext>(
    () => ({
      insertText(text: string) {
        if (!editor) return;
        editor.commands.insertContent(text);
        editor.commands.focus();
      },
      addMention(uid: string, name: string) {
        if (!editor || !name) return;
        editor.commands.insertContent({
          type: "mention",
          attrs: { id: uid, label: name },
        });
        editor.commands.insertContent(" ");
        editor.commands.focus();
      },
      text() {
        return editor ? extractMentionsFromEditor(editor) : undefined;
      },
      plainText() {
        return plainText;
      },
      setPlainText(text: string) {
        applyPlainText(text);
      },
      send(overrideText?: string) {
        return send(overrideText);
      },
      openFilePicker() {
        fileInputRef.current?.click();
      },
      triggerMention() {
        if (!editor) return;
        editor.commands.insertContent("@");
        editor.commands.focus();
      },
      triggerExpand() {
        onExpand?.(plainText);
      },
      insertEmoji(emoji: { key: string }) {
        if (!editor) return;
        editor.commands.insertContent(emoji.key);
        editor.commands.focus();
      },
      async insertSticker(sticker: OctoComposerStickerArgs) {
        const content = new LottieSticker();
        content.category = sticker.category;
        content.url = sticker.path;
        content.placeholder = sticker.placeholder;
        content.format = sticker.format;
        await conversationContext.sendMessage(content);
      },
      addAttachment(files: File[]) {
        // 只更新 ref，不调 setState：主端 addPendingAttachments 紧跟着会调 notifyPendingAttachmentsChange，
        // 订阅触发的 syncPendingAttachments 会从 ref 读最新值并 setState。
        // 若此处再 setState 会与订阅 setState 形成 FIFO 竞态，被后者覆盖回旧值。
        pendingAttachmentsRef.current = [
          ...pendingAttachmentsRef.current,
          ...files,
        ];
      },
      getAttachmentFiles() {
        return pendingAttachmentsRef.current;
      },
    }),
    [applyPlainText, conversationContext, editor, onExpand, plainText, send]
  );

  useEffect(() => {
    const conversationAny = conversationContext as any;
    conversationAny._messageInputContext = composerContext;
    onContext?.(composerContext);

    if (conversationAny._pendingInsertText) {
      composerContext.insertText(conversationAny._pendingInsertText);
      conversationAny._pendingInsertText = undefined;
    }

    return () => {
      if (conversationAny._messageInputContext === composerContext) {
        conversationAny._messageInputContext = undefined;
      }
    };
  }, [composerContext, conversationContext, onContext]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;
      const error = conversationContext.addPendingAttachments(files);
      if (error) {
        showToast(error);
      }
      event.target.value = "";
    },
    [conversationContext, updatePendingAttachments]
  );

  const handleMentionClick = useCallback(() => {
    if (!editor) return;
    editor.commands.insertContent("@");
    editor.commands.focus();
  }, [editor]);

  const handleExpandClick = useCallback(() => {
    onExpand?.(plainText);
  }, [onExpand, plainText]);

  const handleEmoji = useCallback(
    (emoji: { key: string }) => {
      if (!editor) return;
      editor.commands.insertContent(emoji.key);
      editor.commands.focus();
      setEmojiOpen(false);
    },
    [editor]
  );

  const handleSticker = useCallback(
    async (sticker: {
      category: string;
      path: string;
      placeholder: string;
      format: string;
    }) => {
      const content = new LottieSticker();
      content.category = sticker.category;
      content.url = sticker.path;
      content.placeholder = sticker.placeholder;
      content.format = sticker.format;
      await conversationContext.sendMessage(content);
      setEmojiOpen(false);
    },
    [conversationContext]
  );

  const canSend =
    !sending && (plainText.trim().length > 0 || pendingAttachments.length > 0);

  return (
    <div
      className={`octo-composer-shell octo-composer-shell-${contextClassName}`}
    >
      <div className="octo-composer wk-messageinput-box" ref={rootRef}>
        {pendingAttachments.length > 0 && (
          <div className="octo-composer-chips">
            {pendingAttachments.map((file, index) => (
              <div
                className="octo-composer-chip"
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              >
                <span className="octo-composer-chip-badge">
                  {getAttachmentBadge(file)}
                </span>
                <span className="octo-composer-chip-name" title={file.name}>
                  {file.name}
                </span>
                <span className="octo-composer-chip-size">
                  {formatFileSize(file.size)}
                </span>
                <button
                  className="octo-composer-chip-remove"
                  onClick={() =>
                    updatePendingAttachments((prev) =>
                      prev.filter((_, i) => i !== index)
                    )
                  }
                  title="移除"
                  type="button"
                >
                  <ComposerIcon
                    className="octo-composer-chip-remove-icon"
                    path={COMPOSER_ICONS.close}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="octo-composer-input-wrap">
          {botCommands && botCommands.length > 0 && (
            <SlashCommandMenuComponent
              commands={botCommands}
              filter={slashFilter}
              visible={slashMenuVisible}
              activeIndex={slashActiveIndex}
              onSelect={handleSlashSelect}
            />
          )}
          <div
            className="octo-composer-editor"
            onClick={() => editor?.commands.focus()}
          >
            <EditorContentView editor={editor} />
          </div>
        </div>

        {renderToolbar && (
          <div className="octo-composer-toolbar">
            <div className="octo-composer-tools">
              <button
                className="octo-composer-tool"
                onClick={() => setEmojiOpen((open) => !open)}
                ref={emojiButtonRef}
                title="表情"
                type="button"
              >
                <ComposerIcon path={COMPOSER_ICONS.emoji} />
              </button>
              <button
                className="octo-composer-tool octo-composer-tool-mention"
                onClick={handleMentionClick}
                title="@提及"
                type="button"
              >
                <ComposerIcon path={COMPOSER_ICONS.at} />
              </button>
              <button
                className="octo-composer-tool"
                onClick={openFilePicker}
                title="附件"
                type="button"
              >
                <ComposerIcon path={COMPOSER_ICONS.attach} />
              </button>
              <button
                className="octo-composer-tool"
                onClick={handleExpandClick}
                title="全屏编辑"
                type="button"
              >
                <ComposerIcon path={COMPOSER_ICONS.expand} />
              </button>
            </div>

            <div className="octo-composer-toolbar-spacer" />

            <div className="octo-composer-count">
              <span className="octo-composer-count-current">
                {plainText.length}
              </span>
              <span> / {MAX_MESSAGE_LENGTH}</span>
            </div>

            <button
              className={`octo-composer-send${canSend ? " is-active" : ""}${
                sending ? " is-sending" : ""
              }`}
              disabled={!canSend}
              onClick={() => void send()}
              title="发送"
              type="button"
            >
              <ComposerIcon
                className="octo-composer-send-icon"
                path={COMPOSER_ICONS.send}
              />
            </button>
          </div>
        )}

        {renderToolbar && emojiOpen && (() => {
          const emojiContent = (
            <>
              <div className="octo-composer-emoji-mask" onClick={() => setEmojiOpen(false)} />
              <div
                className={`octo-composer-emoji-panel${contextClassName === 'cmdk' ? ' is-portal' : ''}`}
                ref={emojiPanelRef}
                style={contextClassName === 'cmdk' && emojiButtonRef.current ? (() => {
                  const btnRect = emojiButtonRef.current!.getBoundingClientRect();
                  const availableAbove = btnRect.top - 8;
                  return {
                    position: 'fixed' as const,
                    bottom: `${window.innerHeight - btnRect.top + 8}px`,
                    left: `${btnRect.left}px`,
                    maxHeight: `${Math.max(availableAbove, 200)}px`,
                  };
                })() : undefined}
              >
                <EmojiPanelComponent
                  onEmoji={handleEmoji}
                  onSticker={(sticker: any) => void handleSticker(sticker)}
                />
              </div>
            </>
          );
          return contextClassName === 'cmdk'
            ? createPortal(emojiContent, document.body)
            : emojiContent;
        })()}

        <input
          accept="*/*"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: "none" }}
          type="file"
        />
      </div>
    </div>
  );
};

export default OctoComposer;
