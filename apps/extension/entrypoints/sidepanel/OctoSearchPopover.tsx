/**
 * OctoSearchPopover — top-bar 下方的全局搜索面板。
 *
 * 受父控制 isOpen；搜索查询/分页/去抖/竞态守卫全部在内部维护，父只关心开关。
 * 点击外部关闭由父组件 handleClickOutsideSettings 统一处理（识别
 * .octo-search-pop class），本组件保持该 class 不变。
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageContentManager, SystemContent } from "wukongimjssdk";
import { WKApp } from "@dmwork/base";
import { avatarGradient, getFirstChar } from "@dmwork/base/src/Utils/avatar";

type SearchTab = "contacts" | "groups" | "files";

interface SearchResult {
  friends?: any[];
  groups?: any[];
  messages?: any[];
}

interface OctoSearchPopoverProps {
  isOpen: boolean;
}

function jsonToUint8Array(json: any): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(json));
}

function stripMark(html: string): string {
  if (!html) return "";
  return html.replace(/<\/?mark>/gi, "");
}

function sanitizeHighlight(html: string): string {
  if (!html) return "";
  const OPEN = "\x00MARK_OPEN\x00";
  const CLOSE = "\x00MARK_CLOSE\x00";
  let out = html.replace(/<mark>/gi, OPEN).replace(/<\/mark>/gi, CLOSE);
  out = out
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  out = out
    .replace(new RegExp(OPEN, "g"), "<mark>")
    .replace(new RegExp(CLOSE, "g"), "</mark>");
  return out;
}

const TABS: { key: SearchTab; label: string }[] = [
  { key: "contacts", label: "联系人" },
  { key: "groups", label: "群组" },
  { key: "files", label: "文件" },
];

const OctoSearchPopover: React.FC<OctoSearchPopoverProps> = ({ isOpen }) => {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("contacts");
  const [result, setResult] = useState<SearchResult | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const composingRef = useRef(false);

  const doSearch = useCallback(async (keyword: string, nextTab: SearchTab) => {
    const contentTypes: number[] = nextTab === "files" ? [8] : [];
    const spaceId = WKApp.shared.currentSpaceId;
    const searchUrl = spaceId
      ? `/search/global?space_id=${encodeURIComponent(spaceId)}`
      : "/search/global";
    requestIdRef.current += 1;
    const reqId = requestIdRef.current;
    try {
      const res = await WKApp.apiClient.post(searchUrl, {
        keyword,
        content_type: contentTypes,
        page: 1,
        limit: 20,
      });
      if (reqId !== requestIdRef.current) return;
      res?.friends?.forEach((v: any) => {
        if (v.channel_remark) v.channel_name = v.channel_remark;
      });
      res?.groups?.forEach((v: any) => {
        if (v.channel_remark) v.channel_name = v.channel_remark;
      });
      res?.messages?.forEach((v: any) => {
        if (v.channel?.channel_remark) {
          v.channel.channel_name = v.channel.channel_remark;
        }
        if (v.payload) {
          try {
            const contentType = v.payload.type;
            const mc =
              MessageContentManager.shared().getMessageContent(contentType);
            if (mc) {
              mc.decode(jsonToUint8Array(v.payload));
              if (mc instanceof SystemContent) {
                (mc as any).content.content = "[系统消息]";
              }
              v.content = mc;
            }
          } catch {
            // Ignore decode errors — fall back to raw payload fields
          }
        }
      });
      setResult({
        friends: res?.friends || [],
        groups: res?.groups || [],
        messages: res?.messages || [],
      });
    } catch (e) {
      if (reqId !== requestIdRef.current) return;
      console.warn("[OctoSearchPopover] Search failed:", e);
      setResult(null);
    }
  }, []);

  // 开/关时重置：打开触发空查询，关闭清空
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTab("contacts");
      setResult(null);
      void doSearch("", "contacts");
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setQuery("");
      setTab("contacts");
      setResult(null);
    }
  }, [isOpen, doSearch]);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    },
    []
  );

  if (!isOpen) return null;

  const scheduleSearch = (keyword: string, nextTab: SearchTab) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void doSearch(keyword.trim(), nextTab);
    }, 300);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    if (composingRef.current) return; // IME mid-composition, wait for compositionend
    scheduleSearch(next, tab);
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    const next = (e.target as HTMLInputElement).value;
    setQuery(next);
    scheduleSearch(next, tab);
  };

  const handleTabChange = (nextTab: SearchTab) => {
    setTab(nextTab);
    void doSearch(query.trim(), nextTab);
  };

  const friends = result?.friends ?? [];
  const groups = result?.groups ?? [];
  const messages = result?.messages ?? [];
  const counts: Record<SearchTab, number> = {
    contacts: friends.length,
    groups: groups.length,
    files: messages.length,
  };

  type Item = { id: string; name: string; sub: string };
  const items: Item[] = [];
  if (tab === "contacts") {
    for (const c of friends) {
      items.push({
        id: String(c.channel_id || c.uid || c.id),
        name: c.channel_name || c.uid || "",
        sub: "",
      });
    }
  } else if (tab === "groups") {
    for (const g of groups) {
      items.push({
        id: String(g.channel_id || g.group_no || g.id),
        name: g.channel_name || "",
        sub: g.member_count ? `${g.member_count} 人` : "",
      });
    }
  } else {
    for (const m of messages) {
      const fileName =
        (m.content as any)?.content?.name ||
        (m.content as any)?.name ||
        m.payload?.name ||
        m.payload?.content ||
        "文件";
      const fromChannel = m.channel?.channel_name || "";
      items.push({
        id: String(m.message_id || m.id),
        name: fileName,
        sub: fromChannel,
      });
    }
  }

  return (
    <div className="octo-search-pop">
      <div className="octo-search-input-wrap">
        <svg
          className="octo-search-input-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="octo-search-input"
          placeholder="搜索联系人、群组、文件…"
          value={query}
          onChange={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          autoFocus
        />
      </div>
      <div className="octo-search-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`octo-search-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => handleTabChange(t.key)}
            type="button"
          >
            <span>{t.label}</span>
            {counts[t.key] > 0 && (
              <span className="octo-search-tab-count">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>
      <div className="octo-search-results">
        {items.length === 0 ? (
          <div className="octo-search-empty">
            {result === null
              ? "加载中…"
              : query.trim() === ""
              ? "暂无数据"
              : "无匹配结果"}
          </div>
        ) : (
          items.map((item) => {
            const plain = stripMark(item.name) || "?";
            return (
              <div key={item.id} className="octo-search-result-item">
                <span
                  className="octo-search-result-avatar"
                  style={{ background: avatarGradient(plain) }}
                >
                  {getFirstChar(plain)}
                </span>
                <span className="octo-search-result-text">
                  <div
                    className="octo-search-result-name"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHighlight(item.name),
                    }}
                  />
                  {item.sub && (
                    <div className="octo-search-result-sub">{item.sub}</div>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OctoSearchPopover;
