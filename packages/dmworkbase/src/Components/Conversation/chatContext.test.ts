import { describe, it, expect } from "vitest";
import { buildChatContext } from "./chatContext";

describe("buildChatContext", () => {
  const loginUID = "me";

  describe("group chat with subscribers (fallback path)", () => {
    it("returns memberContext from subscribers when messages are empty", () => {
      const result = buildChatContext({
        messages: [],
        subscribers: [
          { uid: "alice", name: "Alice", remark: "Ali" },
          { uid: "me", name: "Me" },
          { uid: "bob", name: "Bob" },
        ],
        channelType: 2,
        loginUID,
      });
      expect(result.memberContext).toContain("Alice");
      expect(result.memberContext).toContain("Ali");
      expect(result.memberContext).toContain("Bob");
      expect(result.memberContext).not.toContain("Me");
      expect(result.chatContext).toBeUndefined();
    });

    it("skips deleted members", () => {
      const result = buildChatContext({
        messages: [],
        subscribers: [
          { uid: "alice", name: "Alice", isDeleted: 1 },
          { uid: "bob", name: "Bob" },
        ],
        channelType: 2,
        loginUID,
      });
      expect(result.memberContext).not.toContain("Alice");
      expect(result.memberContext).toContain("Bob");
    });
  });

  describe("private chat with channelInfo", () => {
    it("returns peer name and remark from channelInfo", () => {
      const result = buildChatContext({
        messages: [],
        subscribers: [],
        channelType: 1,
        loginUID,
        channelInfo: {
          title: "Jerry",
          orgData: { remark: "J-Man" },
        },
      });
      expect(result.memberContext).toContain("Jerry");
      expect(result.memberContext).toContain("J-Man");
    });

    it("returns undefined memberContext when channelInfo is null", () => {
      const result = buildChatContext({
        messages: [],
        subscribers: [],
        channelType: 1,
        loginUID,
        channelInfo: null,
      });
      expect(result.memberContext).toBeUndefined();
    });
  });

  describe("chatContext from messages", () => {
    it("builds chat context from last 10 messages", () => {
      const messages = Array.from({ length: 12 }, (_, i) => ({
        fromUID: `user${i}`,
        from: { title: `User${i}` },
        content: { text: `msg${i}` },
      }));
      const result = buildChatContext({
        messages,
        subscribers: [],
        channelType: 2,
        loginUID,
      });
      expect(result.chatContext).not.toContain("[User0]");
      expect(result.chatContext).not.toContain("[User1]");
      expect(result.chatContext).toContain("[User2]: msg2");
      expect(result.chatContext).toContain("[User11]: msg11");
    });

    it("returns all messages when count < 10", () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        fromUID: `user${i}`,
        from: { title: `User${i}` },
        content: { text: `msg${i}` },
      }));
      const result = buildChatContext({
        messages,
        subscribers: [],
        channelType: 2,
        loginUID,
      });
      expect(result.chatContext).toContain("[User0]: msg0");
      expect(result.chatContext).toContain("[User4]: msg4");
    });

    it("degrades gracefully when message content.text is missing", () => {
      const messages = [
        { fromUID: "u1", from: { title: "Alice" }, content: {} },
        { fromUID: "u2", from: { title: "Bob" }, content: undefined },
      ];
      const result = buildChatContext({
        messages: messages as any,
        subscribers: [],
        channelType: 2,
        loginUID,
      });
      expect(result.chatContext).toContain("[Alice]: ");
      expect(result.chatContext).toContain("[Bob]: ");
    });

    it("falls back to fromUID when from.title is missing", () => {
      const messages = [
        { fromUID: "me", content: { text: "hello" } },
        { fromUID: "alice", from: { title: "Alice" }, content: { text: "hi" } },
      ];
      const result = buildChatContext({
        messages: messages as any,
        subscribers: [],
        channelType: 2,
        loginUID,
      });
      expect(result.chatContext).toContain("[me]: hello");
      expect(result.chatContext).toContain("[Alice]: hi");
    });
  });
});
