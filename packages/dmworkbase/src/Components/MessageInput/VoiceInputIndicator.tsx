import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Toast, Dropdown } from "@douyinfe/semi-ui";
import { Mic } from "lucide-react";
import useVoiceInput from "./useVoiceInput";
import "./voiceInput.css";
import { ChatContextResult } from "../Conversation/chatContext";
import { VoiceMode } from "../../Service/VoiceService";

type ReplaceMode = "all" | "selection" | "insert";

interface VoiceInputIndicatorProps {
  onTranscribed: (
    text: string,
    replaceMode: ReplaceMode,
    savedSelectedText?: string
  ) => void;
  getCurrentText?: () => string | undefined;
  getSelectedText?: () => string | undefined;
  getChatContext?: () => ChatContextResult;
}

// Floating indicator positioning constants
const FLOATING_GAP = 20;
const INDICATOR_HEIGHT = 48;

// Long-press timing constants (PRD: 400ms threshold)
const PREPARING_DELAY_MS = 200;
const LONG_PRESS_THRESHOLD_MS = 400;

// 模式配置 - 匹配 Figma 设计：语音输入 / 语音编辑
const VOICE_MODES: { value: VoiceMode; label: string; description: string }[] =
  [
    { value: "append_only", label: "语音输入", description: "" },
    { value: "edit_only", label: "语音编辑", description: "" },
  ];

export default function VoiceInputIndicator({
  onTranscribed,
  getCurrentText,
  getSelectedText,
  getChatContext,
}: VoiceInputIndicatorProps) {
  // Voice mode menu state (不保存选中的模式，每次都是临时选择)
  const [showModeMenu, setShowModeMenu] = useState(false);

  // fn+space 快捷键状态
  const fnSpaceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preparingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnSpaceDownTimeRef = useRef<number | null>(null);
  const fnSpaceRecordingRef = useRef(false);
  const fnSpaceModeRef = useRef<VoiceMode>("append_only");
  const cancelPendingRef = useRef(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;
  const buttonGroupRef = useRef<HTMLDivElement>(null);

  // Floating indicator position state
  const [floatingPosition, setFloatingPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Network status detection - PRD: 无网络时话筒 icon 置灰
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 记录开始录音时是否有选中文本，用于决定替换模式
  const hadSelectionRef = useRef(false);
  // 记录开始录音时选中的文本内容（用于后续定位替换）
  const savedSelectedTextRef = useRef<string | undefined>(undefined);
  // 记录当前录音使用的模式（用于 onTranscribed 回调）
  const recordingModeRef = useRef<VoiceMode>("append_only");

  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecordingAndTranscribe,
    cancelRecording,
    isVoiceEnabled,
    currentMode,
  } = useVoiceInput({
    onTranscribed: (text: string) => {
      // 根据模式和是否有选中文本决定替换方式
      const mode = recordingModeRef.current;
      if (mode === "edit_only") {
        if (hadSelectionRef.current && savedSelectedTextRef.current) {
          onTranscribed(text, "selection", savedSelectedTextRef.current);
        } else {
          onTranscribed(text, "all");
        }
      } else {
        // 语音输入模式：插入到光标处
        onTranscribed(text, "insert");
      }
    },
    getChatContext,
    mode: recordingModeRef.current,
    onError: (error) => {
      // 麦克风权限被拒绝时显示中文提示
      if (
        error.message.includes("denied") ||
        error.message.includes("Permission") ||
        error.message.includes("NotAllowedError")
      ) {
        Toast.error("请允许麦克风访问权限");
      } else if (
        error.message.includes("NotFoundError") ||
        error.message.includes("NotReadableError")
      ) {
        // 设备不存在或不可用
        Toast.error("麦克风不可用");
      } else if (
        !error.message.includes("file size") &&
        !error.message.includes("Transcription failed")
      ) {
        // 兜底：显示通用错误（排除已在 useVoiceInput 中 Toast 的错误）
        Toast.error("语音输入失败");
      }
    },
    onRecordingFailed: () => {
      shiftRecordingRef.current = false;
      cancelPendingRef.current = false;
      setIsPreparing(false);
    },
  });

  // Refs to avoid closure staleness in timer/keyboard callbacks
  const startRecordingRef = useRef(startRecording);
  startRecordingRef.current = startRecording;
  const stopRecordingRef = useRef(stopRecordingAndTranscribe);
  stopRecordingRef.current = stopRecordingAndTranscribe;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const isTranscribingRef = useRef(isTranscribing);
  isTranscribingRef.current = isTranscribing;

  const clearFnSpaceTimer = () => {
    if (fnSpaceTimerRef.current !== null) {
      clearTimeout(fnSpaceTimerRef.current);
      fnSpaceTimerRef.current = null;
    }
    if (preparingTimerRef.current !== null) {
      clearTimeout(preparingTimerRef.current);
      preparingTimerRef.current = null;
    }
    fnSpaceDownTimeRef.current = null;
    setIsPreparing(false);
  };

  // Handle transition from preparing/pending -> actual recording or auto-cancel.
  useEffect(() => {
    if (isRecording && cancelPendingRef.current) {
      cancelPendingRef.current = false;
      shiftRecordingRef.current = false;
      setIsPreparing(false);
      cancelRecording();
      return;
    }
    if (isRecording) {
      setIsPreparing(false);
    }
  }, [isRecording, cancelRecording]);

  // Calculate floating indicator position when recording starts
  const updateFloatingPosition = useCallback(() => {
    if (!buttonGroupRef.current) return;

    // Find the parent .wk-messageinput-card element
    const card = buttonGroupRef.current.closest(".wk-messageinput-card");
    if (!card) return;

    const cardRect = card.getBoundingClientRect();
    setFloatingPosition({
      top: cardRect.top - FLOATING_GAP - INDICATOR_HEIGHT,
      left: cardRect.left + cardRect.width / 2,
    });
  }, []);

  // Update position when recording or transcribing, and on window resize/scroll
  useEffect(() => {
    if (!isRecording && !isTranscribing) {
      setFloatingPosition(null);
      return;
    }

    updateFloatingPosition();

    const handleResize = () => updateFloatingPosition();

    // 使用 requestAnimationFrame 节流 scroll 事件
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updateFloatingPosition();
        rafId = null;
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isRecording, isTranscribing, updateFloatingPosition]);

  // Keyboard shortcut: fn+space (PRD 要求)
  // 短按 fn+space（< 400ms）→ 语音输入
  // 长按 fn+space（≥ 400ms）→ 语音编辑
  // 再次按 fn+space 或松开 → 停止录音
  // Esc → 取消录音
  useEffect(() => {
    if (!isVoiceEnabled) return;

    // 检测是否为 fn+space（Fn 修饰键 + Space，或单独 Space 无其他修饰键）
    const isFnSpace = (e: KeyboardEvent): boolean => {
      if (e.code !== "Space") return false;
      // 检查 Fn 修饰键状态（部分浏览器支持）
      const fnPressed = e.getModifierState?.("Fn") ?? false;
      // 如果有 Fn 修饰键，或者没有其他修饰键（Mac 上 fn+space 可能不触发 Fn 状态）
      // 排除 Shift/Ctrl/Alt/Meta 组合
      const noOtherModifiers =
        !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
      return fnPressed || noOtherModifiers;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc 取消录音
      if (e.code === "Escape" && isRecordingRef.current) {
        e.preventDefault();
        cancelRecording();
        fnSpaceRecordingRef.current = false;
        return;
      }

      // fn+space 快捷键
      if (isFnSpace(e) && !e.repeat) {
        e.preventDefault();

        // 如果正在录音，再次按 fn+space 停止录音
        if (isRecordingRef.current) {
          fnSpaceRecordingRef.current = false;
          const contextText = getCurrentText?.();
          stopRecordingRef.current(contextText);
          return;
        }

        // 如果正在转写，忽略
        if (isTranscribingRef.current) return;

        // 检查网络状态
        if (!isOnlineRef.current) {
          Toast.warning("网络不可用，无法使用语音功能");
          return;
        }

        // 如果还没开始计时，记录按下时间
        if (fnSpaceDownTimeRef.current === null) {
          fnSpaceDownTimeRef.current = Date.now();
          cancelPendingRef.current = false;

          // 显示准备状态
          preparingTimerRef.current = setTimeout(() => {
            preparingTimerRef.current = null;
            setIsPreparing(true);
          }, PREPARING_DELAY_MS);

          // 长按 400ms 后进入语音编辑模式并开始录音
          fnSpaceTimerRef.current = setTimeout(() => {
            fnSpaceTimerRef.current = null;
            setIsPreparing(false);
            fnSpaceRecordingRef.current = true;
            fnSpaceModeRef.current = "edit_only";
            // 记录选中文本
            const selectedText = getSelectedText?.();
            hadSelectionRef.current = !!selectedText;
            savedSelectedTextRef.current = selectedText;
            recordingModeRef.current = "edit_only";
            startRecordingRef.current("edit_only");
          }, LONG_PRESS_THRESHOLD_MS);
        }
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // fn+space 松开
      if (e.code === "Space") {
        const downTime = fnSpaceDownTimeRef.current;

        // 如果计时器还在（< 400ms 松开），触发语音输入
        if (fnSpaceTimerRef.current !== null && downTime !== null) {
          const pressDuration = Date.now() - downTime;
          clearFnSpaceTimer();

          // 短按（< 400ms）→ 语音输入模式
          if (pressDuration < LONG_PRESS_THRESHOLD_MS) {
            e.preventDefault();
            if (!isOnlineRef.current) {
              Toast.warning("网络不可用，无法使用语音功能");
              return;
            }
            fnSpaceRecordingRef.current = true;
            fnSpaceModeRef.current = "append_only";
            // 记录选中文本（语音输入模式也可能有选中）
            const selectedText = getSelectedText?.();
            hadSelectionRef.current = !!selectedText;
            savedSelectedTextRef.current = selectedText;
            recordingModeRef.current = "append_only";
            startRecordingRef.current("append_only");
          }
          return;
        }

        // 长按录音中松开 → 停止录音
        if (fnSpaceRecordingRef.current && isRecordingRef.current) {
          e.preventDefault();
          fnSpaceRecordingRef.current = false;
          const contextText = getCurrentText?.();
          stopRecordingRef.current(contextText);
          return;
        }

        // 长按但录音还没开始（等待麦克风权限）→ 取消
        if (fnSpaceRecordingRef.current && !isRecordingRef.current) {
          cancelPendingRef.current = true;
          fnSpaceRecordingRef.current = false;
          clearFnSpaceTimer();
          return;
        }

        // 清理状态
        fnSpaceDownTimeRef.current = null;
      }
    };

    const handleBlurWhilePreparing = () => {
      clearFnSpaceTimer();
      fnSpaceRecordingRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlurWhilePreparing);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlurWhilePreparing);
      clearFnSpaceTimer();
    };
  }, [isVoiceEnabled, getCurrentText, getSelectedText, cancelRecording]);

  // Window blur: auto-stop recording
  useEffect(() => {
    if (!isRecording) return;
    const handleBlur = () => {
      const contextText = getCurrentText?.();
      stopRecordingAndTranscribe(contextText);
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [isRecording, stopRecordingAndTranscribe, getCurrentText]);

  if (!isVoiceEnabled) return null;

  // Handle mode selection - 点击菜单选项直接用该模式开始录音（不保存状态）
  const handleModeSelect = (selectedMode: VoiceMode) => {
    setShowModeMenu(false);

    // 直接用选中的模式开始录音（不保存到 state）
    if (isOnline) {
      // 记录开始录音时是否有选中文本、选中文本内容和使用的模式
      const selectedText = getSelectedText?.();
      hadSelectionRef.current = !!selectedText;
      savedSelectedTextRef.current = selectedText;
      recordingModeRef.current = selectedMode;
      startRecording(selectedMode);
    }
  };

  // Handle click/keyboard for voice button
  const handleVoiceClick = () => {
    setShowModeMenu(false);

    if (!isOnline) {
      Toast.warning("网络不可用，无法使用语音功能");
      return;
    }
    // 点击麦克风 icon 固定使用语音输入模式
    const selectedText = getSelectedText?.();
    hadSelectionRef.current = !!selectedText;
    savedSelectedTextRef.current = selectedText;
    recordingModeRef.current = "append_only";
    startRecording("append_only");
  };

  const handleVoiceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleVoiceClick();
    }
  };

  // Handle stop recording click/keyboard
  const handleStopClick = () => {
    // 语音编辑模式：优先使用选中文字，否则使用全部内容
    // 语音输入模式：使用全部内容作为上下文
    let contextText: string | undefined;
    if (currentMode === "edit_only") {
      const selectedText = getSelectedText?.();
      contextText = selectedText || getCurrentText?.();
    } else {
      contextText = getCurrentText?.();
    }
    stopRecordingAndTranscribe(contextText);
  };

  const handleStopKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleStopClick();
    }
  };

  if (isTranscribing) {
    // If no position yet, still show the button in recording state
    if (!floatingPosition) {
      return (
        <div className="wk-voice-button-group" ref={buttonGroupRef}>
          <div
            className="wk-voice-button wk-voice-button--recording"
            title="转写中..."
          >
            <Mic size={18} color="currentColor" />
          </div>
        </div>
      );
    }

    const transcribingIndicator = (
      <div
        className="wk-voice-floating-indicator"
        style={{
          top: floatingPosition.top,
          left: floatingPosition.left,
          transform: "translateX(-50%)",
        }}
      >
        <div className="wk-voice-floating-content">
          <span className="wk-voice-floating-text">转写中</span>
        </div>
        <span className="wk-voice-floating-divider" />
        <div className="wk-voice-transcribing-spinner" />
      </div>
    );

    return (
      <>
        {createPortal(transcribingIndicator, document.body)}
        <div className="wk-voice-button-group" ref={buttonGroupRef}>
          <div
            className="wk-voice-button wk-voice-button--recording"
            title="转写中..."
          >
            <Mic size={18} color="currentColor" />
            <svg
              width="6"
              height="4"
              viewBox="0 0 6 4"
              fill="currentColor"
              className="wk-voice-arrow"
            >
              <path d="M0.5 0.5L3 3.5L5.5 0.5H0.5Z" />
            </svg>
          </div>
        </div>
      </>
    );
  }

  if (isRecording) {
    // If no position yet, still show the button in recording state
    if (!floatingPosition) {
      return (
        <div
          className="wk-voice-button-group"
          ref={buttonGroupRef}
          onClick={handleStopClick}
          onKeyDown={handleStopKeyDown}
          style={{ cursor: "pointer" }}
        >
          <div
            className="wk-voice-button wk-voice-button--recording"
            title="点击停止录音"
            role="button"
            tabIndex={0}
          >
            <Mic size={18} color="currentColor" />
            <svg
              width="6"
              height="4"
              viewBox="0 0 6 4"
              fill="currentColor"
              className="wk-voice-arrow"
            >
              <path d="M0.5 0.5L3 3.5L5.5 0.5H0.5Z" />
            </svg>
          </div>
        </div>
      );
    }

    const floatingIndicator = (
      <div
        className="wk-voice-floating-indicator"
        style={{
          top: floatingPosition.top,
          left: floatingPosition.left,
          transform: "translateX(-50%)",
        }}
      >
        <div className="wk-voice-floating-content">
          <span className="wk-voice-floating-text">
            {currentMode === "edit_only" ? "语音编辑" : "语音输入"}
          </span>
        </div>
        <span className="wk-voice-floating-divider" />
        <div className="wk-voice-wave-container">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className="wk-voice-wave-bar" />
          ))}
        </div>
      </div>
    );

    return (
      <>
        {createPortal(floatingIndicator, document.body)}
        <div
          className="wk-voice-button-group"
          ref={buttonGroupRef}
          onClick={handleStopClick}
          onKeyDown={handleStopKeyDown}
          style={{ cursor: "pointer" }}
        >
          <div
            className="wk-voice-button wk-voice-button--recording"
            title="点击停止录音"
            role="button"
            tabIndex={0}
          >
            <Mic size={18} color="currentColor" />
            <svg
              width="6"
              height="4"
              viewBox="0 0 6 4"
              fill="currentColor"
              className="wk-voice-arrow"
            >
              <path d="M0.5 0.5L3 3.5L5.5 0.5H0.5Z" />
            </svg>
          </div>
        </div>
      </>
    );
  }

  if (isPreparing) {
    return (
      <div className="wk-voice-button-group" ref={buttonGroupRef}>
        <div
          className="wk-voice-button wk-voice-button--preparing"
          title="准备中..."
        >
          <Mic size={18} color="currentColor" />
          <svg
            width="6"
            height="4"
            viewBox="0 0 6 4"
            fill="currentColor"
            className="wk-voice-arrow"
          >
            <path d="M0.5 0.5L3 3.5L5.5 0.5H0.5Z" />
          </svg>
        </div>
      </div>
    );
  }

  // 默认状态：显示麦克风按钮和下拉箭头（一体交互）
  // hover 整个按钮 → 箭头向上 + 弹出选择框
  // 直接点击 icon → 开始语音输入
  // PRD: 无网络时话筒 icon 置灰，点击时 Toast「网络不可用，无法使用语音功能」
  const isActive = showModeMenu;

  const dropdownMenu = (
    <Dropdown.Menu style={{ width: 160 }}>
      {VOICE_MODES.map((mode) => (
        <Dropdown.Item
          key={mode.value}
          onClick={() => handleModeSelect(mode.value)}
        >
          {mode.label}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  );

  return (
    <Dropdown
      trigger="hover"
      position="topRight"
      render={dropdownMenu}
      visible={isOnline ? showModeMenu : false}
      onVisibleChange={setShowModeMenu}
      spacing={4}
    >
      <div
        className={`wk-voice-button-group ${
          isActive ? "wk-voice-button-group--active" : ""
        }`}
        ref={buttonGroupRef}
        onClick={handleVoiceClick}
        onKeyDown={handleVoiceKeyDown}
        style={{
          cursor: isOnline ? "pointer" : "not-allowed",
        }}
      >
        {/* 麦克风 + 箭头一体，点击整个区域开始录音 */}
        <div
          className={`wk-voice-button ${
            !isOnline
              ? "wk-voice-button--disabled"
              : isActive
              ? "wk-voice-button--active"
              : ""
          }`}
          title={isOnline ? "语音输入 (长按 Shift)" : "网络不可用"}
          role="button"
          tabIndex={isOnline ? 0 : -1}
        >
          <Mic size={18} color="currentColor" />
          <svg
            width="6"
            height="4"
            viewBox="0 0 6 4"
            fill="currentColor"
            className={`wk-voice-arrow ${isActive ? "wk-voice-arrow--up" : ""}`}
          >
            <path d="M0.5 0.5L3 3.5L5.5 0.5H0.5Z" />
          </svg>
        </div>
      </div>
    </Dropdown>
  );
}
