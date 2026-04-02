import React from "react";

/** 加入 Space — 登入门 icon */
export function IconJoinSpace() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
    );
}

/** 创建 Space — 加号 icon */
export function IconCreateSpace() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}
