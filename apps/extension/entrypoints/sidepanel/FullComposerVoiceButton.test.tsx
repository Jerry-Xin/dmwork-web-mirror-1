import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";

const mockStartRecording = vi.fn();
const mockStopRecordingAndTranscribe = vi.fn();
const mockCancelRecording = vi.fn();
let mockIsVoiceEnabled = true;
let mockIsRecording = false;
let mockIsTranscribing = false;

vi.mock("@dmwork/base/src/Components/MessageInput/useVoiceInput", () => ({
  default: (opts: any) => ({
    isRecording: mockIsRecording,
    isTranscribing: mockIsTranscribing,
    startRecording: mockStartRecording,
    stopRecordingAndTranscribe: mockStopRecordingAndTranscribe,
    cancelRecording: mockCancelRecording,
    isVoiceEnabled: mockIsVoiceEnabled,
    currentMode: opts?.mode ?? "smart",
  }),
}));

vi.mock("@dmwork/base/src/Service/VoiceService", () => ({
  VoiceMode: {},
}));

import FullComposerVoiceButton from "./FullComposerVoiceButton";

function renderToContainer(element: React.ReactElement): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(element);
  // Flush microtasks for React 18 concurrent rendering
  return container;
}

describe("FullComposerVoiceButton", () => {
  const defaultProps = {
    getCurrentText: () => "existing text",
    onTranscribed: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsVoiceEnabled = true;
    mockIsRecording = false;
    mockIsTranscribing = false;
    document.body.innerHTML = "";
  });

  it("renders a button when voice is enabled", async () => {
    const container = renderToContainer(
      <FullComposerVoiceButton {...defaultProps} />
    );
    await vi.waitFor(() => {
      const btn = container.querySelector("button");
      expect(btn).not.toBeNull();
      expect(btn!.className).toContain("octo-fullcomp-voice-btn");
    });
  });

  it("renders nothing when voice is disabled", async () => {
    mockIsVoiceEnabled = false;
    const container = renderToContainer(
      <FullComposerVoiceButton {...defaultProps} />
    );
    await vi.waitFor(() => {
      expect(container.querySelector("button")).toBeNull();
    });
  });

  it("calls startRecording on pointerDown", async () => {
    const container = renderToContainer(
      <FullComposerVoiceButton {...defaultProps} />
    );
    await vi.waitFor(() => {
      const btn = container.querySelector("button")!;
      expect(btn).not.toBeNull();
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(mockStartRecording).toHaveBeenCalled();
    });
  });

  it("calls stopRecordingAndTranscribe with current text on pointerUp", async () => {
    const container = renderToContainer(
      <FullComposerVoiceButton {...defaultProps} />
    );
    await vi.waitFor(() => {
      const btn = container.querySelector("button")!;
      expect(btn).not.toBeNull();
      btn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      expect(mockStopRecordingAndTranscribe).toHaveBeenCalledWith("existing text");
    });
  });

  it("is disabled when transcribing", async () => {
    mockIsTranscribing = true;
    const container = renderToContainer(
      <FullComposerVoiceButton {...defaultProps} />
    );
    await vi.waitFor(() => {
      const btn = container.querySelector("button") as HTMLButtonElement;
      expect(btn).not.toBeNull();
      expect(btn.disabled).toBe(true);
    });
  });

  it("has is-recording class when recording", async () => {
    mockIsRecording = true;
    const container = renderToContainer(
      <FullComposerVoiceButton {...defaultProps} />
    );
    await vi.waitFor(() => {
      const btn = container.querySelector("button")!;
      expect(btn).not.toBeNull();
      expect(btn.className).toContain("is-recording");
    });
  });
});
