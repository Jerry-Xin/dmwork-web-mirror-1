/**
 * OctoSpaceSwitcherPopover — top-bar 下方的空间切换面板。
 *
 * 点击外部关闭由父组件 handleClickOutsideSettings 统一处理（识别
 * .octo-space-switcher-pop class），本组件保持该 class 不变。
 */

import React from "react";
import type { Space } from "@dmwork/base/src/Service/SpaceService";
import { avatarGradient } from "@dmwork/base/src/Utils/avatar";
import { getFirstChar } from "@dmwork/base/src/Utils/avatar";

interface OctoSpaceSwitcherPopoverProps {
  isOpen: boolean;
  spaces: Space[];
  currentSpaceId: string;
  onSelect: (spaceId: string) => void;
}

const OctoSpaceSwitcherPopover: React.FC<OctoSpaceSwitcherPopoverProps> = ({
  isOpen,
  spaces,
  currentSpaceId,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="octo-space-switcher-pop is-open">
      <div className="octo-space-switcher-title">切换空间</div>
      <div className="octo-space-switcher-list">
        {spaces.map((space) => {
          const isCurrent = space.space_id === currentSpaceId;
          const meta =
            space.max_users > 0
              ? `${space.member_count}/${space.max_users} 人`
              : `${space.member_count} 人`;
          return (
            <button
              key={space.space_id}
              type="button"
              className={`octo-space-item${isCurrent ? " is-current" : ""}`}
              onClick={() => onSelect(space.space_id)}
            >
              {space.logo ? (
                <img
                  className="octo-space-item-avatar"
                  src={space.logo}
                  alt=""
                />
              ) : (
                <span
                  className="octo-space-item-avatar"
                  style={{
                    background: avatarGradient(space.name || space.space_id),
                  }}
                >
                  {getFirstChar(space.name || "?")}
                </span>
              )}
              <span className="octo-space-item-text">
                <span className="octo-space-item-name">{space.name}</span>
                <span className="octo-space-item-meta">{meta}</span>
              </span>
              {isCurrent && (
                <svg
                  className="octo-space-item-check"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OctoSpaceSwitcherPopover;
