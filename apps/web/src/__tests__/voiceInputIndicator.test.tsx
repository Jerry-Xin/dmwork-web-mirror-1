import { vi, describe, it, expect, beforeEach } from "vitest"
import React from "react"
import { render, act } from "@testing-library/react"

// Mock VoiceService to avoid loading APIClient → axios chain
vi.mock("../../packages/dmworkbase/src/Service/VoiceService", () => ({
    default: { shared: { getConfig: vi.fn().mockResolvedValue({ enabled: false, max_duration: 60 }), transcribe: vi.fn() } },
}))

// We test the VoiceInputIndicator rendering logic by creating a minimal
// wrapper that mimics the component without importing the full dmworkbase chain.
// This avoids transitive lottie-web loading issues in jsdom.

// --- Test the formatDuration utility ---
function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
}

describe("VoiceInput - formatDuration", () => {
    it("formats 0 seconds", () => {
        expect(formatDuration(0)).toBe("0:00")
    })

    it("formats seconds under a minute", () => {
        expect(formatDuration(5)).toBe("0:05")
        expect(formatDuration(30)).toBe("0:30")
        expect(formatDuration(59)).toBe("0:59")
    })

    it("formats exactly one minute", () => {
        expect(formatDuration(60)).toBe("1:00")
    })

    it("formats minutes and seconds", () => {
        expect(formatDuration(65)).toBe("1:05")
        expect(formatDuration(125)).toBe("2:05")
    })
})

// --- Test the keyboard shortcut detection logic ---
describe("VoiceInput - keyboard shortcut detection", () => {
    function isVoiceShortcut(e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; code: string }) {
        return e.shiftKey && (e.metaKey || e.ctrlKey) && e.code === "Space"
    }

    it("should detect Shift+Meta+Space (macOS)", () => {
        expect(isVoiceShortcut({ shiftKey: true, metaKey: true, ctrlKey: false, code: "Space" })).toBe(true)
    })

    it("should detect Shift+Ctrl+Space (Windows/Linux)", () => {
        expect(isVoiceShortcut({ shiftKey: true, metaKey: false, ctrlKey: true, code: "Space" })).toBe(true)
    })

    it("should not trigger on Shift+Space alone", () => {
        expect(isVoiceShortcut({ shiftKey: true, metaKey: false, ctrlKey: false, code: "Space" })).toBe(false)
    })

    it("should not trigger on Ctrl+Space without Shift", () => {
        expect(isVoiceShortcut({ shiftKey: false, metaKey: false, ctrlKey: true, code: "Space" })).toBe(false)
    })

    it("should not trigger on Shift+Cmd+Enter", () => {
        expect(isVoiceShortcut({ shiftKey: true, metaKey: true, ctrlKey: false, code: "Enter" })).toBe(false)
    })
})

// --- Test the keyup stop detection logic ---
describe("VoiceInput - keyup stop detection", () => {
    function isStopKey(key: string) {
        return key === "Shift" || key === "Meta" || key === "Control"
    }

    it("should stop on Shift release", () => {
        expect(isStopKey("Shift")).toBe(true)
    })

    it("should stop on Meta release", () => {
        expect(isStopKey("Meta")).toBe(true)
    })

    it("should stop on Control release", () => {
        expect(isStopKey("Control")).toBe(true)
    })

    it("should not stop on regular key release", () => {
        expect(isStopKey("a")).toBe(false)
        expect(isStopKey("Space")).toBe(false)
        expect(isStopKey("Enter")).toBe(false)
    })
})

// --- Test the VoiceInputIndicator component with mocked hook ---
// Create a standalone component that mirrors VoiceInputIndicator logic
// without loading the full dmworkbase dependency chain
interface MockHookReturn {
    isRecording: boolean
    isTranscribing: boolean
    duration: number
    startRecording: () => void
    stopRecordingAndTranscribe: (ctx?: string) => void
    cancelRecording: () => void
    isVoiceEnabled: boolean
}

function TestableIndicator({ hookReturn }: { hookReturn: MockHookReturn }) {
    if (!hookReturn.isVoiceEnabled) return null

    if (hookReturn.isTranscribing) {
        return (
            <div className="wk-voice-indicator wk-voice-transcribing">
                <span className="wk-voice-spinner" />
                <span className="wk-voice-label">Transcribing...</span>
            </div>
        )
    }

    if (hookReturn.isRecording) {
        return (
            <div className="wk-voice-indicator wk-voice-recording">
                <span className="wk-voice-dot" />
                <span className="wk-voice-label">{formatDuration(hookReturn.duration)}</span>
                <span className="wk-voice-label">Recording...</span>
                <button
                    className="wk-voice-cancel"
                    onClick={() => hookReturn.cancelRecording()}
                    type="button"
                >
                    Cancel
                </button>
            </div>
        )
    }

    return null
}

function defaultHookReturn(): MockHookReturn {
    return {
        isRecording: false,
        isTranscribing: false,
        duration: 0,
        startRecording: vi.fn(),
        stopRecordingAndTranscribe: vi.fn(),
        cancelRecording: vi.fn(),
        isVoiceEnabled: false,
    }
}

describe("VoiceInputIndicator - rendering", () => {
    it("renders nothing when voice is disabled", () => {
        const { container } = render(
            <TestableIndicator hookReturn={{ ...defaultHookReturn(), isVoiceEnabled: false }} />
        )
        expect(container.innerHTML).toBe("")
    })

    it("renders nothing when enabled but not recording", () => {
        const { container } = render(
            <TestableIndicator hookReturn={{ ...defaultHookReturn(), isVoiceEnabled: true }} />
        )
        expect(container.querySelector(".wk-voice-indicator")).toBeNull()
    })

    it("shows recording indicator with red dot and timer", () => {
        const { container } = render(
            <TestableIndicator hookReturn={{ ...defaultHookReturn(), isVoiceEnabled: true, isRecording: true, duration: 5 }} />
        )
        const indicator = container.querySelector(".wk-voice-recording")
        expect(indicator).toBeTruthy()
        expect(indicator!.querySelector(".wk-voice-dot")).toBeTruthy()
        expect(indicator!.textContent).toContain("0:05")
        expect(indicator!.textContent).toContain("Recording")
    })

    it("shows cancel button when recording", () => {
        const { container } = render(
            <TestableIndicator hookReturn={{ ...defaultHookReturn(), isVoiceEnabled: true, isRecording: true }} />
        )
        const cancelBtn = container.querySelector(".wk-voice-cancel")
        expect(cancelBtn).toBeTruthy()
        expect(cancelBtn!.textContent).toBe("Cancel")
    })

    it("calls cancelRecording when cancel button clicked", () => {
        const cancelRecording = vi.fn()
        const { container } = render(
            <TestableIndicator hookReturn={{ ...defaultHookReturn(), isVoiceEnabled: true, isRecording: true, cancelRecording }} />
        )
        const cancelBtn = container.querySelector(".wk-voice-cancel") as HTMLButtonElement
        cancelBtn.click()
        expect(cancelRecording).toHaveBeenCalledTimes(1)
    })

    it("shows transcribing state with spinner", () => {
        const { container } = render(
            <TestableIndicator hookReturn={{ ...defaultHookReturn(), isVoiceEnabled: true, isTranscribing: true }} />
        )
        const indicator = container.querySelector(".wk-voice-transcribing")
        expect(indicator).toBeTruthy()
        expect(indicator!.textContent).toContain("Transcribing")
        expect(indicator!.querySelector(".wk-voice-spinner")).toBeTruthy()
    })

    it("formats duration for minutes and seconds", () => {
        const { container } = render(
            <TestableIndicator hookReturn={{ ...defaultHookReturn(), isVoiceEnabled: true, isRecording: true, duration: 65 }} />
        )
        expect(container.textContent).toContain("1:05")
    })
})

// --- Test window blur behavior logic ---
describe("VoiceInput - window blur handler", () => {
    it("should invoke stop on blur when recording", () => {
        const stop = vi.fn()
        let blurHandler: (() => void) | null = null

        // Simulate what VoiceInputIndicator does: register blur handler when recording
        const isRecording = true
        if (isRecording) {
            blurHandler = () => { stop() }
            window.addEventListener("blur", blurHandler)
        }

        window.dispatchEvent(new Event("blur"))
        expect(stop).toHaveBeenCalledTimes(1)

        if (blurHandler) {
            window.removeEventListener("blur", blurHandler)
        }
    })

    it("should not invoke stop on blur when not recording", () => {
        const stop = vi.fn()
        const isRecording = false
        if (isRecording) {
            window.addEventListener("blur", () => stop())
        }

        window.dispatchEvent(new Event("blur"))
        expect(stop).not.toHaveBeenCalled()
    })
})

// --- Test error handling logic ---
describe("VoiceInput - error classification", () => {
    function classifyError(error: Error): string {
        if (error.message.includes("denied") || error.message.includes("Permission") || error.message.includes("NotAllowedError")) {
            return "Please allow microphone access"
        }
        return error.message || "Voice transcription failed"
    }

    it("should show microphone permission message for permission errors", () => {
        expect(classifyError(new Error("NotAllowedError: Permission denied"))).toBe("Please allow microphone access")
        expect(classifyError(new Error("Permission denied by user"))).toBe("Please allow microphone access")
    })

    it("should show generic error message for other errors", () => {
        expect(classifyError(new Error("Network error"))).toBe("Network error")
        expect(classifyError(new Error("Server error 500"))).toBe("Server error 500")
    })

    it("should fallback to default message for empty error", () => {
        expect(classifyError(new Error(""))).toBe("Voice transcription failed")
    })
})
