export interface MemberInfo {
  uid: string;
  name: string;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildMentionRegex(members: MemberInfo[]): RegExp {
  const specialNames = ["所有人", "all", "everyone"];
  const allNames = [...specialNames, ...members.map((m) => m.name)];
  const unique = [...new Set(allNames)];
  unique.sort((a, b) => b.length - a.length);
  const pattern = unique.map(escapeRegExp).join("|");
  return new RegExp(`@(${pattern})(?=[\\s，。！？,!?]|$)`, "gi");
}

export function parseMentionMarkers(
  text: string,
  members: MemberInfo[]
): Array<{
  type: string;
  text?: string;
  attrs?: { id: string; label: string };
}> {
  const result: Array<{
    type: string;
    text?: string;
    attrs?: { id: string; label: string };
  }> = [];
  const regex = buildMentionRegex(members);
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    const matchStart = match.index;

    if (matchStart > lastIndex) {
      result.push({ type: "text", text: text.slice(lastIndex, matchStart) });
    }

    const isAll =
      name === "所有人" ||
      name.toLowerCase() === "all" ||
      name.toLowerCase() === "everyone";
    const member = members.find(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    );

    if (isAll) {
      result.push({
        type: "mention",
        attrs: { id: "-1", label: "所有人" },
      });
    } else if (member) {
      result.push({
        type: "mention",
        attrs: { id: member.uid, label: member.name },
      });
    } else {
      result.push({ type: "text", text: match[0] });
    }

    lastIndex = match.index + match[0].length;
    if (isAll || member) {
      if (lastIndex < text.length && /\s/.test(text[lastIndex])) {
        result.push({ type: "text", text: " " });
        lastIndex++;
      } else if (lastIndex >= text.length) {
        result.push({ type: "text", text: " " });
      }
    }
  }

  if (lastIndex < text.length) {
    result.push({ type: "text", text: text.slice(lastIndex) });
  }

  return result;
}
