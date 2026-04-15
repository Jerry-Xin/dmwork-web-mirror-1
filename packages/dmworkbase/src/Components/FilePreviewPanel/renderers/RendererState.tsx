import React, { memo } from "react";
import "./RendererState.css";

export type RendererStateType = "loading" | "error" | "empty";

export interface RendererStateProps {
  /** 状态类型 */
  type: RendererStateType;
  /** 消息内容 */
  message?: string;
  /** 重试回调（仅 error 状态显示） */
  onRetry?: () => void;
  /** 自定义类名前缀 */
  className?: string;
}

const defaultMessages: Record<RendererStateType, string> = {
  loading: "加载中...",
  error: "加载失败",
  empty: "暂无内容",
};

/**
 * 渲染器通用状态组件
 * 统一处理 loading、error、empty 三种状态的 UI 展示
 */
export const RendererState = memo(function RendererState({
  type,
  message,
  onRetry,
  className,
}: RendererStateProps) {
  const displayMessage = message || defaultMessages[type];
  const baseClass = className || "wk-renderer-state";

  return (
    <div className={`${baseClass} ${baseClass}--${type}`}>
      {type === "loading" && <div className={`${baseClass}__spinner`} />}
      <span className={`${baseClass}__message`}>{displayMessage}</span>
      {type === "error" && onRetry && (
        <button className={`${baseClass}__retry`} onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
});

export default RendererState;
