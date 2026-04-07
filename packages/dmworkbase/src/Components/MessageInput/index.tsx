import React, { Component, ElementType, HTMLProps } from "react";
import { MentionsInput, Mention, SuggestionDataItem } from 'react-mentions'
import ConversationContext from "../Conversation/context";
import clazz from 'classnames';
import './mention.css'
import WKSDK, { Channel, ChannelTypePerson, Subscriber } from "wukongimjssdk";
import hotkeys from 'hotkeys-js';
import WKApp from "../../App";
import "./index.css"
import InputStyle from "./defaultStyle";
import {IconSend} from '@douyinfe/semi-icons';
import { Notification, Button } from '@douyinfe/semi-ui';
import SlashCommandMenu, { BotCommand } from "../SlashCommandMenu";
import AiBadge from "../AiBadge";
import VoiceInputIndicator from "./VoiceInputIndicator";
import { Maximize2, Minimize2 } from 'lucide-react';
import IconClick from '../IconClick';

/**
 * 用镜像 div 精确测量 textarea 光标的 Y 坐标（相对于 textarea 内容顶部）。
 * 避免比例估算的误差（折行、padding 等影响）。
 */
function getCursorY(textarea: HTMLTextAreaElement): number {
    const computed = window.getComputedStyle(textarea)
    const mirror = document.createElement('div')
    mirror.style.cssText = [
        'position:fixed', 'top:-9999px', 'left:-9999px', 'visibility:hidden',
        `width:${textarea.clientWidth}px`,
        `font-size:${computed.fontSize}`,
        `font-family:${computed.fontFamily}`,
        `font-weight:${computed.fontWeight}`,
        `line-height:${computed.lineHeight}`,
        `padding:${computed.padding}`,
        `border:${computed.border}`,
        `box-sizing:${computed.boxSizing}`,
        'white-space:pre-wrap',
        'word-wrap:break-word',
    ].join(';')

    const textBeforeCursor = textarea.value.substring(0, textarea.selectionEnd)
    mirror.textContent = textBeforeCursor

    // 加一个 span 标记光标位置
    const cursor = document.createElement('span')
    cursor.textContent = '|'
    mirror.appendChild(cursor)

    document.body.appendChild(mirror)
    const cursorY = cursor.offsetTop
    document.body.removeChild(mirror)

    return cursorY
}


const MAX_MESSAGE_LENGTH = 5000;

// Strip zero-width and invisible Unicode characters that may be introduced
// when copying text from other apps (e.g. BotFather in Telegram).
// This prevents slash commands like "/approve" from failing to match.
const INVISIBLE_CHARS_RE = /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064\u034F\u061C\u180E]/g;
function stripInvisibleChars(text: string): string {
    return text.replace(INVISIBLE_CHARS_RE, '');
}
export type OnInsertFnc = (text: string) => void
export type OnAddMentionFnc = (uid: string, name: string) => void

interface MessageInputProps extends HTMLProps<any>{
    context: ConversationContext
    onSend?: (text: string, mention?: MentionModel) => void
    members?: Array<Subscriber>
    onInputRef?: any
    onInsertText?: (fnc: OnInsertFnc) => void
    onAddMention?: (fnc: OnAddMentionFnc) => void
    hideMention?: boolean
    toolbar?: JSX.Element
    onContext?: (ctx: MessageInputContext) => void
    topView?: JSX.Element
    botCommands?: BotCommand[]
    getChatContext?: () => string | undefined
    hasPendingAttachments?: boolean // 有待发送附件时，允许空文字也触发 onSend
    onExpandChange?: (expanded: boolean) => void // 输入框展开/收起回调
}

interface MessageInputState {
    value: string | undefined
    quickReplySelectIndex: number
    slashMenuVisible: boolean
    slashFilter: string
    slashActiveIndex: number
    expanded: boolean  // 输入框是否展开（撑满消息列表区域）
}

export interface MentionEntity {
    uid: string;
    offset: number;
    length: number;
}

export class MentionModel {
    all: boolean = false
    uids?: Array<string>
    entities?: MentionEntity[]
}

export function formatMentionTextV2(text: string): {
    content: string;
    mention: MentionModel | undefined;
} {
    const entities: MentionEntity[] = [];
    const uids: string[] = [];
    let result = '';
    let cursor = 0;
    let all = false;

    const placeholderPattern = /@\[([^:\]]+):([^\]]+)\]/g;
    let match;

    while ((match = placeholderPattern.exec(text)) !== null) {
        const uid = match[1];
        const name = match[2];

        result += text.substring(cursor, match.index);

        if (uid === '-1') {
            all = true;
            const atName = `@${name}`;
            result += atName;
        } else {
            const atName = `@${name}`;
            const offset = result.length;
            result += atName;

            entities.push({ uid, offset, length: atName.length });
            uids.push(uid);
        }

        cursor = match.index + match[0].length;
    }

    result += text.substring(cursor);

    if (all) {
        const mention = new MentionModel();
        mention.all = true;
        return { content: result, mention };
    }

    if (entities.length === 0) {
        return { content: result, mention: undefined };
    }

    const mention = new MentionModel();
    mention.uids = uids;
    mention.entities = entities;
    return { content: result, mention };
}

class MemberSuggestionDataItem implements SuggestionDataItem {
    id!: string | number;
    display!: string;
    icon!: string
    isBot?: boolean
}

export interface MessageInputContext {
    insertText(text: string): void
    addMention(uid: string, name: string): void
    text():string|undefined
}

export default class MessageInput extends Component<MessageInputProps, MessageInputState> implements MessageInputContext {
    toolbars: Array<ElementType>
    inputRef: any
    eventListener: any
    private previousScope: string = 'all'
    private _pasteScrollRAF: number = 0
    constructor(props: MessageInputProps) {
        super(props)
        this.toolbars = []
        this.state = {
            value: "",
            quickReplySelectIndex: 0,
            slashMenuVisible: false,
            slashFilter: "",
            slashActiveIndex: 0,
            expanded: false,
        }
        if (props.onAddMention) {
            props.onAddMention(this.addMention.bind(this))
        }
    }
    text(): string|undefined {
        const { value } = this.state;
        return  value
    }

    componentDidMount() {
        const self = this;
        const scope = "messageInput"
        // Save the previous scope to restore on unmount (fix for scope pollution)
        this.previousScope = hotkeys.getScope()
        hotkeys.filter = function (event) {
            return true;
        }
        hotkeys.setScope(scope);

        const { onInsertText } = this.props
        if (onInsertText) {
            onInsertText(this.insertText.bind(this))
        }

        const { onContext } = this.props
        if (onContext) {
            onContext(this)
        }
        // this.inputRef.focus(); // 自动聚焦在iOS手机端体验不好

    }

    // quickReplyPanelIsShow() { // 快捷回复面板是否显示
    //     const { quickReplyModels } = this.state
    //     return quickReplyModels && quickReplyModels.length > 0
    // }
    componentWillUnmount() {
        const scope = "messageInput"
        // Restore the previous scope to prevent scope pollution
        hotkeys.setScope(this.previousScope);

        if (this.eventListener) {
            document.removeEventListener("keydown", this.eventListener)
        }

        // 清理粘贴滚动的 RAF
        if (this._pasteScrollRAF) {
            cancelAnimationFrame(this._pasteScrollRAF)
            this._pasteScrollRAF = 0
        }
    }

    handleKeyDown = (e: React.KeyboardEvent) => {
        const { slashMenuVisible } = this.state
        if (!slashMenuVisible) return
        const filtered = this.getFilteredSlashCommands()

        if (e.key === 'Escape') {
            e.preventDefault()
            this.setState({ slashMenuVisible: false })
            return
        }

        if (filtered.length === 0) {
            // 没有匹配的命令，Enter 正常发送（仅纯 Enter，排除所有修饰键）
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault()
                this.setState({ slashMenuVisible: false })
                this.send()
            }
            return
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            this.setState((prev) => ({
                slashActiveIndex: (prev.slashActiveIndex + 1) % filtered.length,
            }))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            this.setState((prev) => ({
                slashActiveIndex: (prev.slashActiveIndex - 1 + filtered.length) % filtered.length,
            }))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            this.handleSlashSelect(filtered[this.state.slashActiveIndex])
        }
    }

    handleKeyPressed = (e: any) => {
        if (e.key !== 'Enter') { // 非回车
            return;
        }
        // Shift+Enter 换行，其他修饰键（Ctrl/Alt/Meta）一律不处理
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
            return;
        }
        if (this.state.slashMenuVisible) {
            const filtered = this.getFilteredSlashCommands()
            if (filtered.length > 0) {
                return; // 有匹配的斜杠命令时，由 handleKeyDown 处理选择
            }
            // 没有匹配的命令，关闭菜单并正常发送
            this.setState({ slashMenuVisible: false })
        }
        e.preventDefault();

        this.send()
    }

    send() {
        const { value } = this.state;
        if (value && value.length > MAX_MESSAGE_LENGTH) {
            Notification.error({
                content: `输入内容长度不能大于${MAX_MESSAGE_LENGTH}字符！`,
            })
            return
        }
        const hasText = value && value.trim() !== ""
        if (this.props.onSend && (hasText || this.props.hasPendingAttachments)) {
            const { content, mention } = formatMentionTextV2(value || "");
            this.props.onSend(content, mention);
        }
        this.setState({
            value: '',
            quickReplySelectIndex: 0,
            expanded: false,
        });
        // 发送后收起展开状态
        if (this.state.expanded) {
            this.props.onExpandChange?.(false)
        }
    }

    handleChange = (event: { target: { value: string } }) => {
        const value = stripInvisibleChars(event.target.value)
        const { botCommands } = this.props

        // 只在输入 / 前缀且没有空格时弹出斜杠命令菜单（避免粘贴完整命令时弹出）
        if (botCommands && botCommands.length > 0 && value.startsWith('/') && !value.includes(' ') && !value.includes('\n')) {
            const filter = value.slice(1)
            this.setState({
                value: value,
                slashMenuVisible: true,
                slashFilter: filter,
                slashActiveIndex: 0,
            })
        } else {
            this.setState({
                value: value,
                slashMenuVisible: false,
                slashFilter: "",
                slashActiveIndex: 0,
            })
        }
    }

    toggleExpand = () => {
        const next = !this.state.expanded
        this.props.onExpandChange?.(next)
        this.setState({ expanded: next }, () => {
            // 展开时聚焦输入框（setState callback 保证 DOM 已更新）
            if (next) this.inputRef?.focus()
        })
    }

    getFilteredSlashCommands(): BotCommand[] {
        const { botCommands } = this.props
        const { slashFilter } = this.state
        if (!botCommands) return []
        if (!slashFilter) return botCommands
        const lower = slashFilter.toLowerCase()
        return botCommands.filter(
            (cmd) =>
                cmd.command.toLowerCase().includes(lower) ||
                cmd.description.toLowerCase().includes(lower)
        )
    }

    handleSlashSelect = (cmd: BotCommand) => {
        this.setState({
            value: `${cmd.command.startsWith('/') ? cmd.command : `/${cmd.command}`} `,
            slashMenuVisible: false,
            slashFilter: "",
            slashActiveIndex: 0,
        })
        if (this.inputRef) {
            this.inputRef.focus()
        }
    }

    handleMenuButtonClick = () => {
        this.setState((prev) => ({
            slashMenuVisible: !prev.slashMenuVisible,
            slashFilter: "",
            slashActiveIndex: 0,
        }))
    }


    /**
     * 粘贴后滚动到光标位置。
     *
     * 背景：react-mentions 的 handlePaste 会 preventDefault()，手动拼文本后
     * 通过 setState + componentDidUpdate 调 setSelectionRange。这触发
     * handleSelect → updateHighlighterScroll（highlighter.scrollTop = input.scrollTop）。
     * 但 React re-render 更新 textarea value 后，浏览器会把 scrollTop 重置为 0，
     * 而 setSelectionRange 虽然能设对光标位置，但浏览器不一定在同一帧内自动滚到那里。
     *
     * 方案：用 RAF 循环持续将 scrollTop 设置到光标所在位置，持续约 300ms（约 18 帧）。
     * 因为 react-mentions 的 updateHighlighterScroll 绑在 textarea 的 onScroll 上，
     * 我们设 scrollTop 后 highlighter 也会自动同步。
     */
    /**
     * 粘贴后滚动到光标可见位置。
     * @param scrollTopBefore 粘贴前的 scrollTop（用于中间插入时的"最小滚动"计算）
     * @param isAppend 是否在末尾粘贴
     */
    scrollToCursorAfterPaste = (scrollTopBefore: number = 0, isAppend: boolean = true) => {
        if (this._pasteScrollRAF) {
            cancelAnimationFrame(this._pasteScrollRAF)
            this._pasteScrollRAF = 0
        }

        const startTime = performance.now()
        const MAX_DURATION = 300

        const tick = () => {
            const el = this.inputRef as HTMLTextAreaElement | null
            if (!el) return

            const { scrollHeight, clientHeight, selectionEnd, value } = el
            const maxScroll = scrollHeight - clientHeight
            if (maxScroll <= 0) {
                this._pasteScrollRAF = 0
                return
            }

            let targetScrollTop: number

            if (isAppend) {
                // 尾部粘贴 → 滚到底
                targetScrollTop = maxScroll
            } else {
                // 中间粘贴：用镜像 div 精确测量光标 Y 坐标
                const cursorY = getCursorY(el)

                if (cursorY >= scrollTopBefore && cursorY <= scrollTopBefore + clientHeight) {
                    targetScrollTop = scrollTopBefore
                } else if (cursorY > scrollTopBefore + clientHeight) {
                    // 留一行余量，避免光标刚好被压在底部边缘
                    targetScrollTop = cursorY - clientHeight + 21
                } else {
                    targetScrollTop = cursorY
                }
                targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop))
            }

            if (Math.abs(el.scrollTop - targetScrollTop) > 2) {
                el.scrollTop = targetScrollTop
            }

            if (performance.now() - startTime < MAX_DURATION) {
                this._pasteScrollRAF = requestAnimationFrame(tick)
            } else {
                this._pasteScrollRAF = 0
            }
        }

        this._pasteScrollRAF = requestAnimationFrame(tick)
    }

    insertText(text: string): void {
        let newText = this.state.value + text;
        this.setState(
            {
                value: newText,
            }
        );
        this.inputRef.focus();
    }



    addMention(uid: string, name: string): void {
        if (name) {
            this.insertText(`@[${uid}:${name}] `)
        }
    }

    render() {
        const { members, onInputRef, topView, toolbar, botCommands } = this.props
        const { value, slashMenuVisible, slashFilter, slashActiveIndex, expanded } = this.state
        const hasValue = (value && value.length > 0) || this.props.hasPendingAttachments
        let selectedItems = new Array<MemberSuggestionDataItem>();
        if (members && members.length > 0) {
            selectedItems = members.map<MemberSuggestionDataItem>((member) => {
                const item = new MemberSuggestionDataItem()
                item.id = member.uid
                item.icon = WKApp.shared.avatarChannel(new Channel(member.uid, ChannelTypePerson))
                item.display = member.name
                const chInfo = WKSDK.shared().channelManager.getChannelInfo(new Channel(member.uid, ChannelTypePerson))
                item.isBot = chInfo?.orgData?.robot === 1
                return item
            });
            selectedItems.splice(0, 0, {
                icon: require('./mention.png'),
                id: -1,
                display: '所有人'
            });
        }
        return (
            <div className="wk-messageinput-box" style={expanded ? { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' } : undefined}>

                {
                    topView ? <div className="wk-messageinput-box-top">
                        {topView}
                    </div> : undefined
                }

                <div className="wk-messageinput-bar">
                    {/* <div className="wk-messageinput-tabs"></div> */}
                    <div className="wk-messageinput-toolbar">
                        <div className="wk-messageinput-actionbox">
                            {/* <div className="wk-messageinput-actionitem">
                                <div className={clazz("wk-messageinput-sendbtn", hasValue ? "wk-messageinput-hasValue" : null)} onClick={() => {
                                    this.send()
                                }}>
                                    <IconSend  style={{ color: hasValue ? 'white' : '#666', fontSize: '15px', marginLeft: '4px' }}  />
                                </div>
                            </div> */}

                            {
                                toolbar
                            }
                            <VoiceInputIndicator
                                onTranscribed={(text: string, shouldReplace: boolean) => {
                                    if (shouldReplace) {
                                        // Replace entire input with modified text
                                        this.setState({ value: text })
                                        this.inputRef.focus()
                                    } else {
                                        // Append new transcription
                                        this.insertText(text)
                                    }
                                }}
                                getCurrentText={() => this.state.value}
                                getChatContext={this.props.getChatContext}
                            />

                            {/* <div className="wk-messageinput-actionitem" style={{ cursor: "pointer" }} onClick={() => {
                                window.open("https://jietu.qq.com/")
                            }}>
                                <svg className="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2599" width="15" height="15"><path d="M437.76 430.08L170.496 79.36C156.672 61.44 159.232 35.84 176.64 20.48c16.896-14.848 42.496-12.8 56.832 4.096L512 344.576l278.528-320c14.848-16.896 39.936-18.432 56.832-4.096 17.408 14.848 19.968 40.448 6.144 58.88L586.24 430.08l165.888 190.976c92.672-33.792 196.096 4.096 245.248 89.6 49.152 85.504 29.184 194.048-47.104 256.512-76.288 62.464-186.368 61.44-260.608-3.072-74.752-64.512-92.16-173.056-40.96-257.536-1.536-1.536-3.072-3.584-4.096-5.12L512 527.872 437.76 430.08zM383.488 492.544l77.824 101.888L379.904 701.44c-1.536 1.536-2.56 3.584-4.096 5.12 50.688 84.48 33.792 193.024-40.96 257.536-74.752 64.512-184.832 65.536-260.608 3.072-76.288-62.464-95.744-171.008-47.104-256.512 49.152-85.504 152.576-123.392 245.248-89.6l111.104-128.512zM215.04 931.84c44.032-3.584 82.432-30.72 100.352-70.656 17.92-39.936 13.312-86.528-12.8-122.368-26.112-35.328-69.12-53.76-112.64-48.64-65.536 8.192-112.64 67.584-105.472 133.12 6.656 66.048 64.512 114.176 130.56 108.544z m593.92 0c43.52 5.632 86.528-13.312 112.64-48.64 26.112-35.328 30.72-81.92 12.8-121.856-17.92-39.936-56.32-67.072-100.352-70.656-66.048-5.632-124.416 42.496-131.072 108.032-6.656 65.536 40.448 124.928 105.984 133.12z m0 0" p-id="2600" fill="#515151"></path></svg>
                            </div>
                            {
                                this.getToolbarsUI()
                            }
                            {
                                hideMention ? null : <div className="wk-messageinput-actionitem" style={{ cursor: "pointer" }} onClick={() => {
                                    this.insertText("@")
                                }}>
                                    <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1569" width="15" height="15"><path d="M512 21.333333A496.384 496.384 0 0 0 11.178667 512 496.384 496.384 0 0 0 512 1002.666667a505.002667 505.002667 0 0 0 282.624-85.333334 53.333333 53.333333 0 1 0-59.434667-88.576A398.506667 398.506667 0 0 1 512 896a389.632 389.632 0 0 1-394.154667-384A389.632 389.632 0 0 1 512 128a389.632 389.632 0 0 1 394.154667 384v38.016a82.901333 82.901333 0 0 1-165.717334 0V512A228.48 228.48 0 1 0 512 736.469333a229.376 229.376 0 0 0 164.736-69.717333 189.354667 189.354667 0 0 0 336.085333-116.736V512A496.384 496.384 0 0 0 512 21.333333z m0 608.469334A117.888 117.888 0 1 1 633.770667 512 119.978667 119.978667 0 0 1 512 629.802667z" fill="#707070"></path></svg>
                                </div>
                            } */}



                            {/* <div className={style.actionItem}>
                                <ProfileOutlined style={{ fontSize: '15px' }} />
                            </div>
                            <div className={style.actionItem}>
                                <MehOutlined style={{ fontSize: '15px' }} />
                            </div>
                            <div className={style.actionItem}>
                                <PictureOutlined style={{ fontSize: '15px' }} />
                            </div> */}



                            {/* 展开/收起按钮 */}
                            <div className="wk-messageinput-actionitem">
                                <IconClick
                                    size="sm"
                                    title={expanded ? "收起" : "展开输入框"}
                                    onClick={this.toggleExpand}
                                    icon={expanded
                                        ? <Minimize2 size={15} />
                                        : <Maximize2 size={15} />
                                    }
                                />
                            </div>
                        </div>

                    </div>
                </div>
                <div className="wk-messageinput-inputbox" style={{ position: 'relative', ...(expanded ? { flex: 1, height: 'auto', minHeight: 0 } : {}) }}>
                    {botCommands && botCommands.length > 0 && (
                        <SlashCommandMenu
                            commands={botCommands}
                            filter={slashFilter}
                            visible={slashMenuVisible}
                            activeIndex={slashActiveIndex}
                            onSelect={this.handleSlashSelect}
                        />
                    )}
                    {botCommands && botCommands.length > 0 && (
                        <div
                            className="wk-messageinput-menu-btn"
                            onClick={this.handleMenuButtonClick}
                            title="斜杠命令"
                        >
                            /
                        </div>
                    )}
                    <MentionsInput
                        style={InputStyle.getStyle(expanded)}
                        value={value}
                        onKeyPress={this.handleKeyPressed}
                        onKeyDown={this.handleKeyDown}
                        onChange={this.handleChange}
                        onPaste={(e: any) => {
                            const ta = e.target as HTMLTextAreaElement
                            const scrollTopBefore = ta.scrollTop
                            const isAppend = ta.selectionStart >= ta.value.length
                            this.scrollToCursorAfterPaste(scrollTopBefore, isAppend)
                        }}
                        className="wk-messageinput-input"
                        placeholder={`按 Shift + Enter 换行，按 Enter 发送`}
                        allowSuggestionsAboveCursor={true}
                        inputRef={(ref: any) => {
                            this.inputRef = ref
                            if (onInputRef) {
                                onInputRef(ref)
                            }
                        }}
                    >
                        <Mention
                            className="mentions__mention"
                            trigger={new RegExp(
                                `(@([^'\\s'@]*))$`
                            )}
                            data={selectedItems}
                            markup="@[__id__:__display__]"
                            displayTransform={(id, display) => `@${display}`}
                            appendSpaceOnAdd={true}
                            onAdd={() => {}}
                            renderSuggestion={(
                                suggestion,
                                search,
                                highlightedDisplay,
                                index,
                                focused
                            ) => {
                                return (
                                    <div className={clazz("wk-messageinput-member", focused ? "wk-messageinput-selected" : null)}>
                                        <div className="wk-messageinput-iconbox">
                                            <img alt="" className="wk-messageinput-icon" style={{ width: `24px`, height: `24px`, borderRadius: `24px` }} src={(suggestion as MemberSuggestionDataItem).icon} />
                                        </div>
                                        <div>
                                            <strong>{highlightedDisplay}</strong>
                                            {(suggestion as MemberSuggestionDataItem).isBot && <AiBadge size="small" />}
                                        </div>
                                    </div>
                                )
                            }}
                        />
                    </MentionsInput>
                </div>

            </div>
        )
    }
}