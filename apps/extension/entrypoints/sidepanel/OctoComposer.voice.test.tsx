import { describe, it, expect } from "vitest";
import { buildChatContext } from "@dmwork/base/src/Components/Conversation/chatContext";
import type { ChatContextResult } from "@dmwork/base/src/Components/Conversation/chatContext";

describe("OctoComposer voice integration (behavioral)", () => {
  it("buildChatContext returns memberContext for group chats with subscribers", () => {
    const result: ChatContextResult = buildChatContext({
      messages: [],
      subscribers: [
        { uid: "u1", name: "Alice" },
        { uid: "u2", name: "Bob" },
      ],
      channelType: 2,
      loginUID: "u1",
    });
    expect(result.memberContext).toBe("聊天成员：Bob");
  });

  it("buildChatContext includes remark when different from name", () => {
    const result = buildChatContext({
      messages: [],
      subscribers: [
        { uid: "u1", name: "Alice" },
        { uid: "u2", name: "Bob", remark: "Bobby" },
      ],
      channelType: 2,
      loginUID: "u1",
    });
    expect(result.memberContext).toContain("Bob");
    expect(result.memberContext).toContain("Bobby");
  });

  it("buildChatContext returns chatContext from last messages", () => {
    const result = buildChatContext({
      messages: [
        { fromUID: "u1", from: { title: "Alice" }, content: { text: "hello" } },
        { fromUID: "u2", from: { title: "Bob" }, content: { text: "world" } },
      ],
      subscribers: [],
      channelType: 2,
      loginUID: "u1",
    });
    expect(result.chatContext).toContain("[Alice]: hello");
    expect(result.chatContext).toContain("[Bob]: world");
  });

  it("buildChatContext uses channelInfo for private chats", () => {
    const result = buildChatContext({
      messages: [],
      subscribers: [],
      channelType: 1,
      loginUID: "u1",
      channelInfo: { title: "Charlie", orgData: { remark: "Chas" } },
    });
    expect(result.memberContext).toContain("Charlie");
    expect(result.memberContext).toContain("Chas");
  });

  it("getChatContext is synchronous (returns ChatContextResult, not a Promise)", () => {
    const result = buildChatContext({
      messages: [],
      subscribers: [],
      channelType: 2,
      loginUID: "u1",
    });
    expect(result).not.toBeInstanceOf(Promise);
    expect(typeof result).toBe("object");
  });
});
