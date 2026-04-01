import React, { Component } from 'react'
import { Channel } from 'wukongimjssdk'
import WKApp from '../../App'
import { ChannelTypeCommunityTopic } from '../../Service/Const'
import { Spin } from '@douyinfe/semi-ui'

// 话题数据结构
interface ThreadItem {
    thread_id: string
    channel_id: string
    title: string
    status: string // open / closed
    member_count: number
}

export interface ThreadListProps {
    parentChannelID: string
}

interface ThreadListState {
    threads: ThreadItem[]
    loading: boolean
    error: string
}

// 话题列表组件：展示某个群下的所有话题
export default class ThreadList extends Component<ThreadListProps, ThreadListState> {
    constructor(props: ThreadListProps) {
        super(props)
        this.state = {
            threads: [],
            loading: true,
            error: '',
        }
    }

    componentDidMount() {
        this.fetchThreads()
    }

    componentDidUpdate(prevProps: ThreadListProps) {
        if (prevProps.parentChannelID !== this.props.parentChannelID) {
            this.fetchThreads()
        }
    }

    async fetchThreads() {
        this.setState({ loading: true, error: '' })
        try {
            const resp = await WKApp.apiClient.get(`threads?parent_channel_id=${encodeURIComponent(this.props.parentChannelID)}`)
            const threads = Array.isArray(resp) ? resp : (resp.data || [])
            this.setState({ threads, loading: false })
        } catch (e) {
            this.setState({ loading: false, error: '加载话题列表失败' })
        }
    }

    // 点击话题跳转到话题会话
    onThreadClick(thread: ThreadItem) {
        WKApp.endpoints.showConversation(new Channel(thread.channel_id, ChannelTypeCommunityTopic))
    }

    render() {
        const { threads, loading, error } = this.state

        if (loading) {
            return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Spin spinning={true} />
            </div>
        }

        if (error) {
            return <div style={{ padding: '16px', color: 'var(--semi-color-danger)', textAlign: 'center' }}>
                {error}
            </div>
        }

        if (threads.length === 0) {
            return <div style={{ padding: '16px', color: 'var(--semi-color-text-2)', textAlign: 'center' }}>
                暂无话题
            </div>
        }

        return <div className="wk-thread-list">
            {threads.map((thread) => (
                <div
                    key={thread.thread_id}
                    className="wk-thread-list-item"
                    style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--semi-color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                    onClick={() => this.onThreadClick(thread)}
                >
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>
                            {thread.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--semi-color-text-2)', marginTop: '4px' }}>
                            {thread.member_count} 位成员
                        </div>
                    </div>
                    <div style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: thread.status === 'open' ? 'var(--semi-color-success-light-default)' : 'var(--semi-color-tertiary-light-default)',
                        color: thread.status === 'open' ? 'var(--semi-color-success)' : 'var(--semi-color-text-2)',
                    }}>
                        {thread.status === 'open' ? '进行中' : '已关闭'}
                    </div>
                </div>
            ))}
        </div>
    }
}
