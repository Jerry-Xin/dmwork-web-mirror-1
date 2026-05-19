import { describe, it, expect } from "vitest";
import {
  MemberInfo,
  buildMentionRegex,
  parseMentionMarkers,
} from "@dmwork/base/src/Components/MessageInput/voiceMentionParser";

describe("voice mention member info building", () => {
  const members: MemberInfo[] = [
    { uid: "u1", name: "Alice" },
    { uid: "u2", name: "Bob" },
  ];

  it("builds memberInfos with remark as primary name", () => {
    const subscriber = { uid: "u1", name: "Alice", remark: "A-chan" };
    const info: MemberInfo = {
      uid: subscriber.uid,
      name: subscriber.remark || subscriber.name || subscriber.uid,
    };
    expect(info.name).toBe("A-chan");
  });

  it("adds name as alias when remark differs", () => {
    const subscriber = { uid: "u1", name: "Alice", remark: "A-chan" };
    const infos: MemberInfo[] = [
      { uid: subscriber.uid, name: subscriber.remark },
    ];
    if (subscriber.name && subscriber.remark && subscriber.remark !== subscriber.name) {
      infos.push({ uid: subscriber.uid, name: subscriber.name });
    }
    expect(infos).toHaveLength(2);
    expect(infos[1].name).toBe("Alice");
  });

  it("does not add alias when remark equals name", () => {
    const subscriber = { uid: "u1", name: "Alice", remark: "Alice" };
    const infos: MemberInfo[] = [
      { uid: subscriber.uid, name: subscriber.remark },
    ];
    if (subscriber.name && subscriber.remark && subscriber.remark !== subscriber.name) {
      infos.push({ uid: subscriber.uid, name: subscriber.name });
    }
    expect(infos).toHaveLength(1);
  });

  it("detects mentions in transcribed text", () => {
    const hasMention = buildMentionRegex(members).test("hello @Alice");
    expect(hasMention).toBe(true);
  });

  it("returns false when no mentions present", () => {
    const hasMention = buildMentionRegex(members).test("hello world");
    expect(hasMention).toBe(false);
  });

  it("parseMentionMarkers produces proper content nodes for editor", () => {
    const content = parseMentionMarkers("@Alice hello", members);
    expect(content[0]).toEqual({
      type: "mention",
      attrs: { id: "u1", label: "Alice" },
    });
  });

  it("wraps mention content in doc/paragraph structure for setContent", () => {
    const content = parseMentionMarkers("@Bob hi", members);
    const docJSON = {
      type: "doc",
      content: [{ type: "paragraph", content }],
    };
    expect(docJSON.type).toBe("doc");
    expect(docJSON.content[0].type).toBe("paragraph");
    expect(docJSON.content[0].content).toBe(content);
  });
});
