/**
 * OctoInfoDrawer — 右侧的会话信息抽屉（群/私聊）。
 *
 * 职责：展示会话元信息、置顶/免打扰开关、成员分组、操作按钮；
 * 自身持有抽屉本地 UI state（drawerMuted / AI 成员展开 / 人类成员展开）。
 * 业务动作（rename/clear/leave/togglePin）通过 props 委托给父。
 */

import React, { useState } from "react";
import { Channel, ChannelTypePerson, WKSDK } from "wukongimjssdk";
import {
  ChannelTypeCommunityTopic,
  GroupRole,
} from "@dmwork/base/src/Service/Const";
import { ChannelSettingManager } from "@dmwork/base/src/Service/ChannelSetting";
import { getFirstChar } from "@dmwork/base/src/Utils/avatar";
import { renderDrawerIcon } from "./OctoDrawerIcons";

export interface DrawerMember {
  uid: string;
  name: string;
  remark?: string;
  role?: number;
  status?: number;
  orgData?: Record<string, any>;
}

interface OctoInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChannel: Channel | null;
  selectedChannelName: string;
  members: DrawerMember[];
  memberLoading: boolean;
  pinned: boolean;
  onTogglePin: (channelId: string) => void;
  onRename: () => void | Promise<void>;
  onClear: () => void | Promise<void>;
  onLeave: () => void | Promise<void>;
  onMuteChanged?: () => void;
}

function isAiMember(member: DrawerMember): boolean {
  return member.orgData?.robot === 1;
}

function getDisplayName(member: DrawerMember): string {
  return member.remark || member.name || member.uid;
}

function getMemberSubtitle(member: DrawerMember): string {
  if (isAiMember(member)) {
    const scope =
      member.orgData?.scope ||
      member.orgData?.bot_scope ||
      member.orgData?.robot_name ||
      member.orgData?.bot_name;
    return scope ? `${scope} · 已接入` : "AI 伙伴 · 已接入";
  }
  const title =
    member.orgData?.title || member.orgData?.position || member.orgData?.dept;
  if (member.role === GroupRole.owner) {
    return title ? `${title} · 群主` : "群主";
  }
  if (member.role === GroupRole.manager) {
    return title ? `${title} · 管理员` : "管理员";
  }
  return title || "成员";
}

function getMemberToneClass(member: DrawerMember): string {
  if (isAiMember(member)) return "is-ai";
  const seed = getDisplayName(member) || member.uid;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const tones = ["is-teal", "is-amber", "is-coral", ""];
  return tones[Math.abs(hash) % tones.length];
}

function getDrawerMemberGroups(members: DrawerMember[]): {
  aiMembers: DrawerMember[];
  humanMembers: DrawerMember[];
} {
  const aiMembers = members.filter(isAiMember);
  const humanMembers = members
    .filter((m) => !isAiMember(m))
    .sort((a, b) => {
      const orderA =
        a.role === GroupRole.owner ? 0 : a.role === GroupRole.manager ? 1 : 2;
      const orderB =
        b.role === GroupRole.owner ? 0 : b.role === GroupRole.manager ? 1 : 2;
      if (orderA !== orderB) return orderA - orderB;
      return getDisplayName(a).localeCompare(
        getDisplayName(b),
        "zh-Hans-CN"
      );
    });
  return { aiMembers, humanMembers };
}

const MemberGroup: React.FC<{
  title: string;
  members: DrawerMember[];
  expanded: boolean;
  onToggle: () => void;
}> = ({ title, members, expanded, onToggle }) => {
  return (
    <div className={`octo-sidepanel-mem-group${expanded ? " is-open" : ""}`}>
      <button
        className="octo-sidepanel-mem-head"
        onClick={onToggle}
        type="button"
      >
        <span className="octo-sidepanel-mem-caret">
          {renderDrawerIcon("caret")}
        </span>
        <span className="octo-sidepanel-mem-label">{title}</span>
        <span className="octo-sidepanel-mem-count">{members.length}</span>
      </button>
      {expanded && (
        <div className="octo-sidepanel-mem-body">
          {members.map((member, index) => {
            const isAi = isAiMember(member);
            const isOwner = member.role === GroupRole.owner;
            return (
              <div
                key={`${member.uid}-${index}`}
                className="octo-sidepanel-mem-row"
              >
                <span
                  className={`octo-sidepanel-mem-avatar ${getMemberToneClass(member)}`}
                >
                  {getFirstChar(getDisplayName(member) || member.uid)}
                </span>
                <span className="octo-sidepanel-mem-text">
                  <span className="octo-sidepanel-mem-name">
                    {getDisplayName(member)}
                    {isAi && (
                      <span className="octo-sidepanel-mem-badge octo-sidepanel-mem-badge-ai">
                        AGENT
                      </span>
                    )}
                    {isOwner && (
                      <span className="octo-sidepanel-mem-badge octo-sidepanel-mem-badge-owner">
                        OWNER
                      </span>
                    )}
                  </span>
                  <span className="octo-sidepanel-mem-role">
                    {getMemberSubtitle(member)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const OctoInfoDrawer: React.FC<OctoInfoDrawerProps> = ({
  isOpen,
  onClose,
  selectedChannel,
  selectedChannelName,
  members,
  memberLoading,
  pinned,
  onTogglePin,
  onRename,
  onClear,
  onLeave,
  onMuteChanged,
}) => {
  const [drawerMuted, setDrawerMuted] = useState<boolean | null>(null);
  const [showAiMembers, setShowAiMembers] = useState(true);
  const [showHumanMembers, setShowHumanMembers] = useState(true);

  if (!selectedChannel) return null;

  const isPrivate = selectedChannel.channelType === ChannelTypePerson;
  const channelInfo =
    WKSDK.shared().channelManager.getChannelInfo(selectedChannel);
  const muted = drawerMuted ?? Boolean(channelInfo?.mute);
  const { aiMembers, humanMembers } = getDrawerMemberGroups(members);
  const metaText = isPrivate
    ? "私聊会话"
    : [
        `${members.length || "—"} 人`,
        aiMembers.length > 0 ? `${aiMembers.length} AI` : "",
        selectedChannel.channelType === ChannelTypeCommunityTopic
          ? "Thread"
          : "群聊",
      ]
        .filter(Boolean)
        .join(" · ");

  const handleMuteToggle = async () => {
    const currentMuted = muted;
    const nextMuted = !currentMuted;
    setDrawerMuted(nextMuted);
    try {
      await ChannelSettingManager.shared.mute(nextMuted, selectedChannel);
      await WKSDK.shared()
        .channelManager.fetchChannelInfo(selectedChannel)
        .catch(() => null);
      onMuteChanged?.();
    } catch (e) {
      console.warn("[OctoInfoDrawer] Failed to update mute:", e);
      setDrawerMuted(currentMuted);
    }
  };

  return (
    <div className={`octo-sidepanel-drawer${isOpen ? " is-open" : ""}`}>
      <div className="octo-sidepanel-drawer-head">
        <div className="octo-sidepanel-drawer-title">
          {isPrivate ? "会话信息" : "群信息"}
        </div>
        <button
          className="octo-sidepanel-drawer-close"
          onClick={onClose}
          type="button"
        >
          {renderDrawerIcon("close")}
        </button>
      </div>

      <div className="octo-sidepanel-drawer-body">
        <div className="octo-sidepanel-gi-hero">
          <div className="octo-sidepanel-gi-avatar">
            {getFirstChar(selectedChannelName || selectedChannel.channelID)}
          </div>
          <div className="octo-sidepanel-gi-body">
            <div className="octo-sidepanel-gi-name">
              {selectedChannelName}
              {!isPrivate && (
                <span className="octo-sidepanel-gi-channel">
                  {selectedChannel.channelType === ChannelTypeCommunityTopic
                    ? "Thread"
                    : "# 讨论"}
                </span>
              )}
            </div>
            <div className="octo-sidepanel-gi-meta">
              {channelInfo?.orgData?.category || metaText}
            </div>
          </div>
        </div>

        <div className="octo-sidepanel-gi-section">会话设置</div>

        <button
          className={`octo-sidepanel-gi-toggle${pinned ? " is-on" : ""}`}
          onClick={() => onTogglePin(selectedChannel.channelID)}
          type="button"
        >
          <span className="octo-sidepanel-gi-toggle-icon">
            {renderDrawerIcon("star")}
          </span>
          <span className="octo-sidepanel-gi-toggle-label">置顶在 Rail</span>
          <span className="octo-sidepanel-gi-switch" />
        </button>

        <button
          className={`octo-sidepanel-gi-toggle${muted ? " is-on" : ""}`}
          onClick={() => {
            void handleMuteToggle();
          }}
          type="button"
        >
          <span className="octo-sidepanel-gi-toggle-icon">
            {renderDrawerIcon("bellOff")}
          </span>
          <span className="octo-sidepanel-gi-toggle-label">消息免打扰</span>
          <span className="octo-sidepanel-gi-switch" />
        </button>

        {!isPrivate && (
          <>
            {memberLoading && (
              <div className="octo-sidepanel-mem-empty">加载成员中…</div>
            )}
            {!memberLoading && aiMembers.length > 0 && (
              <MemberGroup
                title="AI 伙伴"
                members={aiMembers}
                expanded={showAiMembers}
                onToggle={() => setShowAiMembers((v) => !v)}
              />
            )}
            {!memberLoading && (
              <MemberGroup
                title="成员"
                members={humanMembers}
                expanded={showHumanMembers}
                onToggle={() => setShowHumanMembers((v) => !v)}
              />
            )}
            {!memberLoading && members.length === 0 && (
              <div className="octo-sidepanel-mem-empty">暂无成员数据</div>
            )}

            <div className="octo-sidepanel-gi-section">操作</div>
            <button
              className="octo-sidepanel-gi-action"
              onClick={() => {
                void onRename();
              }}
              type="button"
            >
              <span className="octo-sidepanel-gi-toggle-icon">
                {renderDrawerIcon("edit")}
              </span>
              <span className="octo-sidepanel-gi-toggle-label">
                重命名群聊
              </span>
            </button>
            <button
              className="octo-sidepanel-gi-action"
              onClick={() => {
                void onClear();
              }}
              type="button"
            >
              <span className="octo-sidepanel-gi-toggle-icon">
                {renderDrawerIcon("trash")}
              </span>
              <span className="octo-sidepanel-gi-toggle-label">
                清空聊天记录
              </span>
            </button>
            <button
              className="octo-sidepanel-gi-action is-danger"
              onClick={() => {
                void onLeave();
              }}
              type="button"
            >
              <span className="octo-sidepanel-gi-toggle-icon">
                {renderDrawerIcon("logout")}
              </span>
              <span className="octo-sidepanel-gi-toggle-label">
                退出该群聊
              </span>
            </button>
          </>
        )}

        {isPrivate && (
          <>
            <div className="octo-sidepanel-gi-section">操作</div>
            <button
              className="octo-sidepanel-gi-action"
              onClick={() => {
                void onClear();
              }}
              type="button"
            >
              <span className="octo-sidepanel-gi-toggle-icon">
                {renderDrawerIcon("trash")}
              </span>
              <span className="octo-sidepanel-gi-toggle-label">
                清空聊天记录
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OctoInfoDrawer;
