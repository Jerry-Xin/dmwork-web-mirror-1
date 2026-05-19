import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests that VoiceInputIndicator passes getPopupContainer to the Semi-UI
 * Dropdown, ensuring the dropdown portal renders inside the button container
 * rather than on document.body (which would cause CmdK panel to close).
 *
 * Strategy: mock Semi-UI Dropdown to capture its props, then render the
 * component and verify getPopupContainer.
 *
 * Note: dmworkbase uses React 17, so we use ReactDOM.render / unmountComponentAtNode.
 */

let capturedDropdownProps: Record<string, unknown> | null = null;

vi.mock("@douyinfe/semi-ui", () => ({
  Toast: { error: vi.fn(), warning: vi.fn() },
  Dropdown: Object.assign(
    (props: Record<string, unknown>) => {
      capturedDropdownProps = props;
      return props.children;
    },
    {
      Menu: ({ children }: { children: unknown }) => children,
      Item: ({ children }: { children: unknown }) => children,
    }
  ),
}));

vi.mock("lucide-react", () => ({
  Mic: () => null,
}));

vi.mock("./useVoiceInput", () => ({
  default: () => ({
    isRecording: false,
    isTranscribing: false,
    startRecording: vi.fn(),
    stopRecordingAndTranscribe: vi.fn(),
    cancelRecording: vi.fn(),
    isVoiceEnabled: true,
    currentMode: "append_only",
  }),
}));

vi.mock("./voiceInput.css", () => ({}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const React = require("react");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactDOM = require("react-dom");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { act } = require("react-dom/test-utils");

describe("VoiceInputIndicator - getPopupContainer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    capturedDropdownProps = null;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
  });

  it("passes getPopupContainer to Dropdown that returns a DOM element", async () => {
    const { default: VoiceInputIndicator } = await import(
      "./VoiceInputIndicator"
    );

    act(() => {
      ReactDOM.render(
        React.createElement(VoiceInputIndicator, { onTranscribed: vi.fn() }),
        container
      );
    });

    expect(capturedDropdownProps).not.toBeNull();
    expect(capturedDropdownProps!.getPopupContainer).toBeDefined();
    expect(typeof capturedDropdownProps!.getPopupContainer).toBe("function");

    const popupContainer = (
      capturedDropdownProps!.getPopupContainer as () => HTMLElement
    )();
    expect(popupContainer).toBeInstanceOf(HTMLElement);
  });

  it("getPopupContainer returns buttonGroupRef element when available (not document.body)", async () => {
    const { default: VoiceInputIndicator } = await import(
      "./VoiceInputIndicator"
    );

    act(() => {
      ReactDOM.render(
        React.createElement(VoiceInputIndicator, { onTranscribed: vi.fn() }),
        container
      );
    });

    const popupContainer = (
      capturedDropdownProps!.getPopupContainer as () => HTMLElement
    )();
    // Should return the buttonGroupRef div (rendered inside container), not document.body
    expect(popupContainer).not.toBe(document.body);
    expect(popupContainer.className).toContain("wk-voice-button-group");
  });
});
