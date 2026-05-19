import { describe, it, expect, vi } from "vitest";
import { applyVoiceTranscription } from "./applyVoiceTranscription";

function createMockEditor() {
  const commands = {
    setContent: vi.fn(),
    insertContent: vi.fn(),
    focus: vi.fn(),
  };
  const chain = {
    setTextSelection: vi.fn().mockReturnThis(),
    insertContent: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };
  return {
    commands,
    chain: vi.fn(() => chain),
    state: {
      doc: {
        descendants: vi.fn(),
      },
    },
    _chain: chain,
  } as any;
}

describe("applyVoiceTranscription", () => {
  it("inserts plain text at cursor in insert mode", () => {
    const editor = createMockEditor();
    applyVoiceTranscription({
      editor,
      members: [],
      text: "hello world",
      replaceMode: "insert",
    });
    expect(editor.commands.insertContent).toHaveBeenCalledWith("hello world");
    expect(editor.commands.focus).toHaveBeenCalled();
  });

  it("uses applyPlainText callback for replaceMode=all without mentions", () => {
    const editor = createMockEditor();
    const applyPlainText = vi.fn();
    applyVoiceTranscription({
      editor,
      members: [],
      text: "hello",
      replaceMode: "all",
      applyPlainText,
    });
    expect(applyPlainText).toHaveBeenCalledWith("hello");
    expect(editor.commands.setContent).not.toHaveBeenCalled();
  });

  it("falls back to editor.commands.setContent for replaceMode=all when no applyPlainText", () => {
    const editor = createMockEditor();
    applyVoiceTranscription({
      editor,
      members: [],
      text: "hello",
      replaceMode: "all",
    });
    expect(editor.commands.setContent).toHaveBeenCalledWith("hello");
  });

  it("replaces selection using savedSelectionRange", () => {
    const editor = createMockEditor();
    applyVoiceTranscription({
      editor,
      members: [],
      text: "replacement",
      replaceMode: "selection",
      savedSelectedText: "original",
      savedSelectionRange: { from: 5, to: 13 },
    });
    expect(editor.chain).toHaveBeenCalled();
    expect(editor._chain.setTextSelection).toHaveBeenCalledWith({ from: 5, to: 13 });
    expect(editor._chain.insertContent).toHaveBeenCalledWith("replacement");
    expect(editor._chain.run).toHaveBeenCalled();
  });

  it("detects mentions and produces mention content nodes for replaceMode=all", () => {
    const editor = createMockEditor();
    applyVoiceTranscription({
      editor,
      members: [{ uid: "u1", name: "Alice" }],
      text: "@Alice hello",
      replaceMode: "all",
    });
    expect(editor.commands.setContent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: expect.arrayContaining([
              expect.objectContaining({ type: "mention", attrs: { id: "u1", label: "Alice" } }),
            ]),
          },
        ],
      })
    );
  });

  it("inserts mention content nodes in insert mode", () => {
    const editor = createMockEditor();
    applyVoiceTranscription({
      editor,
      members: [{ uid: "u1", name: "Bob" }],
      text: "@Bob",
      replaceMode: "insert",
    });
    expect(editor.commands.insertContent).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: "mention", attrs: { id: "u1", label: "Bob" } }),
      ])
    );
  });

  it("uses remark as primary name for mention matching", () => {
    const editor = createMockEditor();
    applyVoiceTranscription({
      editor,
      members: [{ uid: "u1", name: "Alice", remark: "Boss" }],
      text: "@Boss hello",
      replaceMode: "insert",
    });
    expect(editor.commands.insertContent).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: "mention", attrs: { id: "u1", label: "Boss" } }),
      ])
    );
  });

  it("adds name as alias when remark differs and matches on original name", () => {
    const editor = createMockEditor();
    applyVoiceTranscription({
      editor,
      members: [{ uid: "u1", name: "Alice", remark: "Boss" }],
      text: "@Alice hello",
      replaceMode: "insert",
    });
    expect(editor.commands.insertContent).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: "mention", attrs: { id: "u1", label: "Alice" } }),
      ])
    );
  });

  it("handles empty members array without errors", () => {
    const editor = createMockEditor();
    expect(() => {
      applyVoiceTranscription({
        editor,
        members: [],
        text: "@Alice hello",
        replaceMode: "insert",
      });
    }).not.toThrow();
    expect(editor.commands.insertContent).toHaveBeenCalledWith("@Alice hello");
  });
});
