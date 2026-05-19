import { describe, it, expect } from "vitest";
import { parseThreadChannelId } from "@dmwork/base/src/Service/Thread";
import { ChannelTypeCommunityTopic } from "@dmwork/base/src/Service/Const";

describe("CmdK sub-channel ID parsing logic", () => {
  it("parses a valid thread channel ID into groupNo and shortId", () => {
    const result = parseThreadChannelId("group123____short456");
    expect(result).toEqual({ groupNo: "group123", shortId: "short456" });
  });

  it("returns null for a plain channel ID without separator", () => {
    const result = parseThreadChannelId("plainChannelId");
    expect(result).toBeNull();
  });

  it("returns null when separator appears more than once", () => {
    const result = parseThreadChannelId("a____b____c");
    expect(result).toBeNull();
  });

  it("returns groupNo as empty string when ID starts with separator", () => {
    const result = parseThreadChannelId("____short");
    expect(result).toEqual({ groupNo: "", shortId: "short" });
  });

  it("returns shortId as empty string when ID ends with separator", () => {
    const result = parseThreadChannelId("group____");
    expect(result).toEqual({ groupNo: "group", shortId: "" });
  });

  it("ChannelTypeCommunityTopic equals 5", () => {
    expect(ChannelTypeCommunityTopic).toBe(5);
  });
});
