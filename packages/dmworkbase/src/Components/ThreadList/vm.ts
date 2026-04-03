import { Thread } from "../../Service/Thread"
import WKApp from "../../App"

export interface ThreadListState {
  loading: boolean
  threads: Thread[]
  error: string | null
}

export class ThreadListVM {
  private groupNo: string
  private onStateChange: (state: ThreadListState) => void

  private state: ThreadListState = {
    loading: true,
    threads: [],
    error: null,
  }

  constructor(groupNo: string, onStateChange: (state: ThreadListState) => void) {
    this.groupNo = groupNo
    this.onStateChange = onStateChange
  }

  getState(): ThreadListState {
    return this.state
  }

  private setState(newState: Partial<ThreadListState>) {
    this.state = { ...this.state, ...newState }
    this.onStateChange(this.state)
  }

  async load() {
    this.setState({ loading: true, error: null })
    try {
      const threads = await WKApp.dataSource.channelDataSource.threadList(this.groupNo)
      this.setState({ loading: false, threads })
    } catch (err: any) {
      this.setState({ loading: false, error: err?.msg || "加载失败" })
    }
  }

  async archive(shortId: string) {
    try {
      await WKApp.dataSource.channelDataSource.threadArchive(this.groupNo, shortId)
      await this.load()
    } catch (err: any) {
      throw new Error(err?.msg || "归档失败")
    }
  }

  async delete(shortId: string) {
    try {
      await WKApp.dataSource.channelDataSource.threadDelete(this.groupNo, shortId)
      await this.load()
    } catch (err: any) {
      throw new Error(err?.msg || "删除失败")
    }
  }

  async join(shortId: string) {
    try {
      await WKApp.dataSource.channelDataSource.threadJoin(shortId)
      await this.load()
    } catch (err: any) {
      throw new Error(err?.msg || "加入失败")
    }
  }

  async leave(shortId: string) {
    try {
      await WKApp.dataSource.channelDataSource.threadLeave(shortId)
      await this.load()
    } catch (err: any) {
      throw new Error(err?.msg || "离开失败")
    }
  }
}
