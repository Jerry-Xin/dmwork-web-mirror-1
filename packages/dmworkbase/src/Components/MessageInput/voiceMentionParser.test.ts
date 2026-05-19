import { describe, it, expect } from "vitest";
import {
  escapeRegExp,
  buildMentionRegex,
  parseMentionMarkers,
  MemberInfo,
} from "./voiceMentionParser";

describe("voiceMentionParser", () => {
  describe("escapeRegExp", () => {
    it("escapes special regex characters", () => {
      expect(escapeRegExp("hello.world")).toBe("hello\\.world");
      expect(escapeRegExp("a+b*c")).toBe("a\\+b\\*c");
      expect(escapeRegExp("(test)")).toBe("\\(test\\)");
    });

    it("leaves plain strings unchanged", () => {
      expect(escapeRegExp("Alice")).toBe("Alice");
      expect(escapeRegExp("张三")).toBe("张三");
    });
  });

  describe("buildMentionRegex", () => {
    const members: MemberInfo[] = [
      { uid: "u1", name: "Alice" },
      { uid: "u2", name: "Bob" },
    ];

    it("matches @name at end of string", () => {
      const regex = buildMentionRegex(members);
      expect(regex.test("hello @Alice")).toBe(true);
    });

    it("matches @name followed by whitespace", () => {
      const regex = buildMentionRegex(members);
      expect(regex.test("@Bob said hi")).toBe(true);
    });

    it("matches special names: 所有人, all, everyone", () => {
      const members: MemberInfo[] = [{ uid: "u1", name: "Alice" }];
      expect(buildMentionRegex(members).test("@所有人")).toBe(true);
      expect(buildMentionRegex(members).test("@all")).toBe(true);
      expect(buildMentionRegex(members).test("@everyone")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(buildMentionRegex(members).test("@alice")).toBe(true);
      expect(buildMentionRegex(members).test("@ALICE")).toBe(true);
    });

    it("matches @name followed by CJK punctuation", () => {
      expect(buildMentionRegex(members).test("@Alice，你好")).toBe(true);
      expect(buildMentionRegex(members).test("@Bob。")).toBe(true);
    });

    it("does not match partial names without boundary", () => {
      const regex = buildMentionRegex(members);
      expect(regex.test("@AliceSmith")).toBe(false);
    });

    it("sorts longer names first to avoid partial matches", () => {
      const membersWithOverlap: MemberInfo[] = [
        { uid: "u1", name: "Cindy" },
        { uid: "u2", name: "Cindy Che" },
      ];
      const regex = buildMentionRegex(membersWithOverlap);
      const match = regex.exec("@Cindy Che hello");
      expect(match).not.toBeNull();
      expect(match![1]).toBe("Cindy Che");
    });
  });

  describe("parseMentionMarkers", () => {
    const members: MemberInfo[] = [
      { uid: "u1", name: "Alice" },
      { uid: "u2", name: "Bob" },
    ];

    it("returns plain text when no mentions", () => {
      const result = parseMentionMarkers("hello world", members);
      expect(result).toEqual([{ type: "text", text: "hello world" }]);
    });

    it("parses a single mention into mention node + trailing space", () => {
      const result = parseMentionMarkers("@Alice", members);
      expect(result).toEqual([
        { type: "mention", attrs: { id: "u1", label: "Alice" } },
        { type: "text", text: " " },
      ]);
    });

    it("parses mention followed by text", () => {
      const result = parseMentionMarkers("@Bob hello", members);
      expect(result).toEqual([
        { type: "mention", attrs: { id: "u2", label: "Bob" } },
        { type: "text", text: " " },
        { type: "text", text: "hello" },
      ]);
    });

    it("parses text before and after mention", () => {
      const result = parseMentionMarkers("hey @Alice thanks", members);
      expect(result).toEqual([
        { type: "text", text: "hey " },
        { type: "mention", attrs: { id: "u1", label: "Alice" } },
        { type: "text", text: " " },
        { type: "text", text: "thanks" },
      ]);
    });

    it("parses multiple mentions", () => {
      const result = parseMentionMarkers("@Alice @Bob hi", members);
      expect(result).toContainEqual({
        type: "mention",
        attrs: { id: "u1", label: "Alice" },
      });
      expect(result).toContainEqual({
        type: "mention",
        attrs: { id: "u2", label: "Bob" },
      });
    });

    it("parses @所有人 as special mention with id=-1", () => {
      const result = parseMentionMarkers("@所有人", members);
      expect(result).toEqual([
        { type: "mention", attrs: { id: "-1", label: "所有人" } },
        { type: "text", text: " " },
      ]);
    });

    it("parses @all as special mention with id=-1", () => {
      const result = parseMentionMarkers("@all hello", members);
      expect(result).toContainEqual({
        type: "mention",
        attrs: { id: "-1", label: "所有人" },
      });
    });

    it("parses @everyone as special mention with id=-1", () => {
      const result = parseMentionMarkers("@everyone", members);
      expect(result).toContainEqual({
        type: "mention",
        attrs: { id: "-1", label: "所有人" },
      });
    });

    it("keeps unrecognized @mention as plain text", () => {
      const result = parseMentionMarkers("@Unknown hello", members);
      expect(result).toEqual([{ type: "text", text: "@Unknown hello" }]);
    });

    it("is case-insensitive for member matching", () => {
      const result = parseMentionMarkers("@alice", members);
      expect(result).toEqual([
        { type: "mention", attrs: { id: "u1", label: "Alice" } },
        { type: "text", text: " " },
      ]);
    });

    it("handles CJK punctuation after mention without extra space", () => {
      const result = parseMentionMarkers("@Alice，你好", members);
      expect(result).toEqual([
        { type: "mention", attrs: { id: "u1", label: "Alice" } },
        { type: "text", text: "，你好" },
      ]);
    });
  });
});
