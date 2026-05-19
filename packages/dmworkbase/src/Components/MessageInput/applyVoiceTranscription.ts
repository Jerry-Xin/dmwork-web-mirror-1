import type { Editor } from "@tiptap/react";
import {
  MemberInfo,
  buildMentionRegex,
  parseMentionMarkers,
} from "./voiceMentionParser";

export interface ApplyVoiceTranscriptionParams {
  editor: Editor;
  members: Array<{ uid: string; name: string; remark?: string }>;
  text: string;
  replaceMode: "all" | "selection" | "insert";
  savedSelectedText?: string;
  savedSelectionRange?: { from: number; to: number };
  applyPlainText?: (text: string) => void;
}

export function applyVoiceTranscription({
  editor,
  members,
  text,
  replaceMode,
  savedSelectedText,
  savedSelectionRange,
  applyPlainText,
}: ApplyVoiceTranscriptionParams): void {
  const memberInfos: MemberInfo[] = (members ?? []).flatMap((s) => {
    const primary = { uid: s.uid, name: s.remark || s.name || s.uid };
    return s.name && s.remark && s.remark !== s.name
      ? [primary, { uid: s.uid, name: s.name }]
      : [primary];
  });

  const hasMention =
    memberInfos.length > 0 && buildMentionRegex(memberInfos).test(text);

  const findSelectionRange = (
    searchText: string
  ): { from: number; to: number } | null => {
    let found: { from: number; to: number } | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.isText && node.text) {
        const idx = node.text.indexOf(searchText);
        if (idx !== -1) {
          found = { from: pos + idx, to: pos + idx + searchText.length };
          return false;
        }
      }
      return true;
    });
    return found;
  };

  const setAll = (content: string) => {
    if (applyPlainText) {
      applyPlainText(content);
    } else {
      editor.commands.setContent(content);
    }
  };

  if (hasMention) {
    const content = parseMentionMarkers(text, memberInfos);

    if (replaceMode === "all") {
      editor.commands.setContent({
        type: "doc",
        content: [{ type: "paragraph", content }],
      });
    } else if (replaceMode === "selection" && savedSelectedText) {
      const range =
        savedSelectionRange || findSelectionRange(savedSelectedText);
      if (range) {
        editor.chain().setTextSelection(range).insertContent(content).run();
      } else {
        editor.commands.setContent({
          type: "doc",
          content: [{ type: "paragraph", content }],
        });
      }
    } else {
      editor.commands.insertContent(content);
    }
  } else {
    if (replaceMode === "all") {
      setAll(text);
    } else if (replaceMode === "selection" && savedSelectedText) {
      const range =
        savedSelectionRange || findSelectionRange(savedSelectedText);
      if (range) {
        editor.chain().setTextSelection(range).insertContent(text).run();
      } else {
        setAll(text);
      }
    } else {
      editor.commands.insertContent(text);
    }
  }

  editor.commands.focus();
}
