export const TOP_HISTORY_TRIGGER_OFFSET = 250

export interface PulldownScrollRestoreInput {
    previousScrollHeight: number
    previousScrollTop: number
    nextScrollHeight: number
}

export function getPulldownRestoredScrollTop(input: PulldownScrollRestoreInput): number {
    const nextScrollTop = input.previousScrollTop + (input.nextScrollHeight - input.previousScrollHeight)
    return nextScrollTop < 0 ? 0 : nextScrollTop
}

export function shouldPulldownOnWheel(deltaY: number, scrollTop: number, isFullScreen: boolean): boolean {
    if (deltaY >= 0) {
        return false
    }
    if (!isFullScreen) {
        return true
    }
    return scrollTop <= TOP_HISTORY_TRIGGER_OFFSET
}
