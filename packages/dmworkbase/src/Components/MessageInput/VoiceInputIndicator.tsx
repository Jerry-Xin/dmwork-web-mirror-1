import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Toast } from "@douyinfe/semi-ui";
import { Mic } from "lucide-react";
import useVoiceInput from "./useVoiceInput";
import "./voiceInput.css";
import { ChatContextResult } from "../Conversation/chatContext";
// mic-recording.svg import removed - using Mic component instead

interface VoiceInputIndicatorProps {
  onTranscribed: (text: string, shouldReplace: boolean) => void;
  getCurrentText?: () => string | undefined;
  getSelectedText?: () => string | undefined;
  getChatContext?: () => ChatContextResult;
}

type VoiceMode = "input" | "edit";

export default function VoiceInputIndicator({
  onTranscribed,
  getCurrentText,
  getSelectedText,
  getChatContext,
}: VoiceInputIndicatorProps) {
  // Long-press ShiftLeft state
  const shiftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preparingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shiftRecordingRef = useRef(false);
  const cancelPendingRef = useRef(false);
  const [isPreparing, setIsPreparing] = useState(false);

  // Dropdown menu state
  const [showDropdown, setShowDropdown] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("input");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonGroupRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceModeRef = useRef<VoiceMode>(voiceMode);
  voiceModeRef.current = voiceMode;

  // Save selected text before menu click causes focus loss
  const savedSelectionRef = useRef<string | undefined>(undefined);

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

  const PREPARING_DELAY_MS = 300;
  const RECORDING_DELAY_MS = 500;

  const {
    isRecording,
    isTranscribing,
    duration,
    startRecording,
    stopRecordingAndTranscribe,
    cancelRecording,
    isVoiceEnabled,
  } = useVoiceInput({
    onTranscribed,
    getChatContext,
    onError: (error) => {
      // 麦克风权限被拒绝时显示中文提示
      if (
        error.message.includes("denied") ||
        error.message.includes("Permission") ||
        error.message.includes("NotAllowedError")
      ) {
        Toast.error("请允许麦克风访问权限");
      }
      // 其他错误已在 useVoiceInput 中通过 Toast 处理，这里不重复
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

  const clearShiftTimer = () => {
    if (shiftTimerRef.current !== null) {
      clearTimeout(shiftTimerRef.current);
      shiftTimerRef.current = null;
    }
    if (preparingTimerRef.current !== null) {
      clearTimeout(preparingTimerRef.current);
      preparingTimerRef.current = null;
    }
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
      top: cardRect.top - 20 - 48, // 20px gap + 48px indicator height
      left: cardRect.left + cardRect.width / 2,
    });
  }, []);

  // Update position when recording or transcribing, and on window resize
  useEffect(() => {
    if (!isRecording && !isTranscribing) {
      setFloatingPosition(null);
      return;
    }

    updateFloatingPosition();

    const handleResize = () => updateFloatingPosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isRecording, isTranscribing, updateFloatingPosition]);

  // Handle hover enter/leave for dropdown
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Save selection when hovering (before any click causes focus loss)
    if (getSelectedText) {
      savedSelectionRef.current = getSelectedText();
    }
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 150); // Small delay to allow moving to dropdown
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcut: Shift + Cmd/Ctrl + Space, and long-press ShiftLeft
  useEffect(() => {
    if (!isVoiceEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc to cancel recording
      if (e.code === "Escape" && isRecordingRef.current) {
        e.preventDefault();
        cancelRecording();
        return;
      }

      // Existing shortcut: Shift+Cmd/Ctrl+Space
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.code === "Space") {
        if (!isRecordingRef.current && !isTranscribingRef.current) {
          e.preventDefault();
          // Check network status before starting
          if (!isOnlineRef.current) {
            Toast.warning("网络不可用，无法使用语音功能");
            return;
          }
          startRecordingRef.current();
        }
        return;
      }

      // Long-press ShiftLeft: start 500ms timer
      if (
        e.code === "ShiftLeft" &&
        !e.repeat &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        if (
          !isRecordingRef.current &&
          !isTranscribingRef.current &&
          shiftTimerRef.current === null
        ) {
          cancelPendingRef.current = false;
          preparingTimerRef.current = setTimeout(() => {
            preparingTimerRef.current = null;
            setIsPreparing(true);
          }, PREPARING_DELAY_MS);
          shiftTimerRef.current = setTimeout(() => {
            shiftTimerRef.current = null;
            // Check network status before starting
            if (!isOnlineRef.current) {
              Toast.warning("网络不可用，无法使用语音功能");
              setIsPreparing(false);
              return;
            }
            shiftRecordingRef.current = true;
            startRecordingRef.current();
          }, RECORDING_DELAY_MS);
        }
        return;
      }

      if (shiftTimerRef.current !== null && e.code !== "ShiftLeft") {
        // Modifier chord (Ctrl/Meta/Alt pressed): cancel voice intent
        if (
          e.code.startsWith("Control") ||
          e.code.startsWith("Alt") ||
          e.code.startsWith("Meta")
        ) {
          clearShiftTimer();
          return;
        }
        // IME-related events: do not cancel timer
        const isIME =
          e.code.startsWith("Shift") ||
          e.key === "Process" ||
          e.key === "Unidentified" ||
          e.isComposing;
        if (!isIME) {
          clearShiftTimer();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // ShiftLeft released while timer is pending: cancel (normal Shift press)
      if (e.code === "ShiftLeft" && shiftTimerRef.current !== null) {
        clearShiftTimer();
        return;
      }

      // ShiftLeft released while waiting for getUserMedia (recording not yet started)
      if (
        e.code === "ShiftLeft" &&
        shiftRecordingRef.current &&
        !isRecordingRef.current
      ) {
        cancelPendingRef.current = true;
        shiftRecordingRef.current = false;
        return;
      }

      // ShiftLeft released after long-press recording started: stop recording
      if (
        e.code === "ShiftLeft" &&
        shiftRecordingRef.current &&
        isRecordingRef.current
      ) {
        shiftRecordingRef.current = false;
        e.preventDefault();
        // Voice input only - no contextText, no mode
        stopRecordingRef.current();
        return;
      }

      if (!isRecordingRef.current) return;
      // Stop recording when any modifier key is released (existing Shift+Cmd+Space flow)
      if (e.key === "Shift" || e.key === "Meta" || e.key === "Control") {
        // Don't stop if this was a long-press ShiftLeft release handled above
        if (shiftRecordingRef.current) return;
        e.preventDefault();
        // Voice input only - no contextText, no mode
        stopRecordingRef.current();
      }
    };

    const handleBlurWhilePreparing = () => {
      clearShiftTimer();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlurWhilePreparing);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlurWhilePreparing);
      clearShiftTimer();
    };
  }, [isVoiceEnabled, getCurrentText]);

  // Window blur: auto-stop recording
  useEffect(() => {
    if (!isRecording) return;
    const handleBlur = () => {
      // Voice input only - no contextText, no mode
      stopRecordingAndTranscribe();
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [isRecording, stopRecordingAndTranscribe]);

  const handleMenuItemClick = (mode: VoiceMode) => {
    setVoiceMode(mode);
    setShowDropdown(false);
    // Start recording with the selected mode
    startRecording();
  };

  // Get context text for edit mode, considering saved selection
  const getEditContextText = useCallback(() => {
    // If there was selected text, use that; otherwise use full text
    const selectedText = savedSelectionRef.current;
    if (selectedText && selectedText.length > 0) {
      return selectedText;
    }
    return getCurrentText?.();
  }, [getCurrentText]);

  if (!isVoiceEnabled) return null;

  const isEditMode = voiceMode === "edit";

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
          </div>
        </div>
      </>
    );
  }

  if (isRecording) {
    // If no position yet, still show the button in recording state
    if (!floatingPosition) {
      return (
        <div className="wk-voice-button-group" ref={buttonGroupRef}>
          <div
            className="wk-voice-button wk-voice-button--recording"
            title="点击停止录音"
            onClick={() => {
              stopRecordingAndTranscribe();
            }}
            style={{ cursor: "pointer" }}
          >
            <Mic size={18} color="currentColor" />
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
          <span className="wk-voice-floating-text">语音输入</span>
        </div>
        <span className="wk-voice-floating-divider" />
        <div className="wk-voice-wave-container">
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
          <span className="wk-voice-wave-bar" />
        </div>
      </div>
    );

    return (
      <>
        {createPortal(floatingIndicator, document.body)}
        <div className="wk-voice-button-group" ref={buttonGroupRef}>
          <div
            className="wk-voice-button wk-voice-button--recording"
            title="点击停止录音"
            onClick={() => {
              // Voice input only - no contextText, no mode
              stopRecordingAndTranscribe();
            }}
            style={{ cursor: "pointer" }}
          >
            <Mic size={18} color="currentColor" />
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
        </div>
      </div>
    );
  }

  // 默认状态：显示麦克风按钮
  // PRD: 无网络时话筒 icon 置灰，点击时 Toast「网络不可用，无法使用语音功能」
  const handleVoiceClick = () => {
    if (!isOnline) {
      Toast.warning("网络不可用，无法使用语音功能");
      return;
    }
    startRecording();
  };

  return (
    <div className="wk-voice-button-group" ref={buttonGroupRef}>
      <div
        className={`wk-voice-button ${
          !isOnline ? "wk-voice-button--disabled" : ""
        }`}
        title={isOnline ? "语音输入 (长按 Shift)" : "网络不可用"}
        onClick={handleVoiceClick}
        role="button"
        tabIndex={isOnline ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            handleVoiceClick();
          }
        }}
      >
        <Mic size={18} color="currentColor" />
      </div>

      {/* Dropdown Menu - temporarily disabled
      {showDropdown && (
        <div
          className="wk-voice-dropdown-menu"
          ref={dropdownRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={`wk-voice-menu-item ${
              voiceMode === "input" ? "wk-voice-menu-item--active" : ""
            }`}
            onClick={() => handleMenuItemClick("input")}
          >
            <span className="wk-voice-menu-item-text">语音输入</span>
          </div>
          <div
            className={`wk-voice-menu-item ${
              voiceMode === "edit" ? "wk-voice-menu-item--active" : ""
            }`}
            onClick={() => handleMenuItemClick("edit")}
          >
            <span className="wk-voice-menu-item-text">语音编辑</span>
          </div>
        </div>
      )}
      */}
    </div>
  );
}
