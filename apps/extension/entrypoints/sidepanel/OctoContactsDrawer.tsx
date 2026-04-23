/**
 * OctoContactsDrawer — 左侧通讯录抽屉。
 *
 * 分组展示 AI 伙伴（my_bots）+ 空间人类成员；自身维护联系人列表和搜索关键字。
 * 点击联系人会 WKApp.endpoints.showConversation 并调 onClose 关闭抽屉。
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import { WKApp } from "@dmwork/base";
import {
  SpaceService,
  type SpaceMember,
} from "@dmwork/base/src/Service/SpaceService";
import { avatarGradient, getFirstChar } from "@dmwork/base/src/Utils/avatar";

interface OctoContactsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const OctoContactsDrawer: React.FC<OctoContactsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [myBots, setMyBots] = useState<any[]>([]);
  // 记住当前缓存数据属于哪个 spaceId，切换 Space / 关闭再开时自动重拉
  const [loadedSpaceId, setLoadedSpaceId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const loadingRef = useRef(false);

  // 第一页上限：避免一次拉万人导致接口超时 / 前端卡死。
  // TODO: 空间成员超过 CONTACTS_PAGE_SIZE 时需要真正的滚动分页 UI
  const CONTACTS_PAGE_SIZE = 500;

  const loadContacts = useCallback(async () => {
    const spaceId = WKApp.shared.currentSpaceId;
    if (!spaceId) {
      console.warn("[OctoContactsDrawer] No currentSpaceId for contacts");
      return;
    }
    if (loadingRef.current) return;
    if (loadedSpaceId === spaceId) return;
    loadingRef.current = true;
    try {
      const [nextMembers, nextBots] = await Promise.all([
        SpaceService.shared.getMembers(spaceId, 1, CONTACTS_PAGE_SIZE),
        WKApp.apiClient
          .get("/robot/my_bots", { param: { space_id: spaceId } })
          .catch(() => []),
      ]);
      // 请求返回期间若已切换到其他 Space，丢弃本次结果
      if (WKApp.shared.currentSpaceId !== spaceId) return;
      setMembers(nextMembers || []);
      setMyBots(nextBots || []);
      setLoadedSpaceId(spaceId);
    } catch (e) {
      console.warn("[OctoContactsDrawer] Failed to load contacts:", e);
    } finally {
      loadingRef.current = false;
    }
  }, [loadedSpaceId]);

  useEffect(() => {
    if (isOpen) {
      void loadContacts();
    }
  }, [isOpen, loadContacts]);

  // 抽屉关闭后重置 loadedSpaceId，下次打开强制重拉最新成员
  useEffect(() => {
    if (!isOpen) {
      setLoadedSpaceId(null);
    }
  }, [isOpen]);

  const loaded = loadedSpaceId !== null;

  const myUID = WKApp.loginInfo.uid || "";

  let aiPartners = myBots.map((b: any) => ({
    uid: b.uid,
    name: b.name || b.uid,
    avatar: b.avatar || "",
    role: 3,
    robot: 1,
    created_at: "",
  })) as SpaceMember[];

  let friends = members.filter((m) => m.uid !== myUID && m.robot !== 1);

  if (keyword.trim()) {
    const kw = keyword.toLowerCase();
    aiPartners = aiPartners.filter((m) => m.name.toLowerCase().includes(kw));
    friends = friends.filter((m) => m.name.toLowerCase().includes(kw));
  }

  const handleContactClick = (uid: string) => {
    onClose();
    WKApp.endpoints.showConversation(new Channel(uid, ChannelTypePerson));
  };

  return (
    <div className={`octo-contacts-drawer${isOpen ? " is-open" : ""}`}>
      {/* 头部 */}
      <div className="cd-head">
        <button
          className="cd-back"
          onClick={onClose}
          type="button"
          title="返回"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="cd-title">通讯录</div>
        <button className="cd-textbtn" onClick={onClose} type="button">
          关闭
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="cd-search">
        <div className="cd-input">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="搜索朋友、AI 伙伴…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* 内容 */}
      <div className="cd-body">
        {!loaded && <div className="cd-section">加载中…</div>}

        {/* AI 伙伴 */}
        {aiPartners.length > 0 && (
          <>
            <div className="cd-section">AI 伙伴 · {aiPartners.length}</div>
            {aiPartners.map((m) => (
              <div
                key={m.uid}
                className="cd-row"
                onClick={() => handleContactClick(m.uid)}
              >
                <div className="cd-av ai">{getFirstChar(m.name)}</div>
                <div className="cd-txt">
                  <span className="cd-nm">
                    {m.name} <span className="cd-badge-ai">Agent</span>
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* 我的朋友 */}
        {friends.length > 0 && (
          <>
            <div className="cd-section">我的朋友 · {friends.length}</div>
            {friends.map((m) => (
              <div
                key={m.uid}
                className="cd-row"
                onClick={() => handleContactClick(m.uid)}
              >
                <div
                  className="cd-av"
                  style={{ background: avatarGradient(m.name) }}
                >
                  {getFirstChar(m.name)}
                </div>
                <div className="cd-txt">
                  <span className="cd-nm">{m.name}</span>
                </div>
                <span className="cd-chev">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            ))}
          </>
        )}

        {loaded && aiPartners.length === 0 && friends.length === 0 && (
          <div className="cd-empty">
            <span className="cd-empty-icon">👤</span>
            <span>暂无联系人</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OctoContactsDrawer;
