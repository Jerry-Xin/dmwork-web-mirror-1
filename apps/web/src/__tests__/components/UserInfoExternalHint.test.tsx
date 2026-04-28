/**
 * YUJ-67 (dmwork-web #1016) — 外部群成员 UserInfo 底部按钮隐藏逻辑单测。
 *
 * 覆盖 UserInfoVM.isExternalToViewer() 相对当前查看 Space 的判定：
 *   - 跨 space 外部 → hide 发送消息 / 添加好友，显示"仅可在群内交流"
 *   - 同 space 或自看 → 保留原按钮
 *   - 老数据降级（仅 is_external=1 + source_space_name）
 *
 * 逻辑与 dmworkbase/src/Utils/externalViewer.ts 对齐：外部当且仅当
 *   homeSpaceId && homeSpaceId !== viewerSpaceId（新字段优先）
 * 否则降级到 is_external === 1 兼容老数据。
 */

type OrgData = {
  home_space_id?: string;
  home_space_name?: string;
  is_external?: number;
  source_space_name?: string;
};

function resolveExternalForViewer(input: {
  homeSpaceId?: string;
  isExternalLegacy?: number;
  viewerSpaceId?: string;
}): boolean {
  const viewerSpaceId = input.viewerSpaceId ?? '';
  const homeId = input.homeSpaceId ?? '';
  if (homeId && homeId.length > 0) {
    return homeId !== viewerSpaceId;
  }
  return input.isExternalLegacy === 1;
}

/**
 * Mirrors UserInfoVM.isExternalToViewer logic — viewer sees the user as
 * external if either the in-group subscriber or the profile orgData says so.
 */
function isExternalToViewer(opts: {
  isSelf: boolean;
  viewerSpaceId?: string;
  subscriberOrgData?: OrgData;
  channelOrgData?: OrgData;
}): boolean {
  if (opts.isSelf) return false;
  const tryOrg = (org?: OrgData) => {
    if (!org) return false;
    return resolveExternalForViewer({
      homeSpaceId: org.home_space_id,
      isExternalLegacy: org.is_external,
      viewerSpaceId: opts.viewerSpaceId,
    });
  };
  if (tryOrg(opts.subscriberOrgData)) return true;
  if (tryOrg(opts.channelOrgData)) return true;
  return false;
}

function shouldHideSendButton(opts: Parameters<typeof isExternalToViewer>[0]): boolean {
  return isExternalToViewer(opts);
}

describe('YUJ-67 UserInfoVM.isExternalToViewer', () => {
  describe('新字段 home_space_id 优先', () => {
    it('跨 space（home != viewer）→ 隐藏发送消息', () => {
      expect(
        shouldHideSendButton({
          isSelf: false,
          viewerSpaceId: 'space-A',
          subscriberOrgData: { home_space_id: 'space-B', home_space_name: 'SpaceB' },
        })
      ).toBe(true);
    });

    it('同 space（home === viewer）→ 保留发送消息', () => {
      expect(
        shouldHideSendButton({
          isSelf: false,
          viewerSpaceId: 'space-A',
          subscriberOrgData: { home_space_id: 'space-A', home_space_name: 'SpaceA' },
        })
      ).toBe(false);
    });
  });

  describe('自看场景', () => {
    it('isSelf=true 永远不隐藏（getBottomPanel 本身会返回 undefined）', () => {
      expect(
        shouldHideSendButton({
          isSelf: true,
          viewerSpaceId: 'space-A',
          subscriberOrgData: { home_space_id: 'space-B' },
        })
      ).toBe(false);
    });
  });

  describe('降级兼容：老数据（无 home_space_id）', () => {
    it('is_external=1 + source_space_name → 隐藏发送消息', () => {
      expect(
        shouldHideSendButton({
          isSelf: false,
          viewerSpaceId: 'space-A',
          subscriberOrgData: { is_external: 1, source_space_name: 'SpaceB' },
        })
      ).toBe(true);
    });

    it('is_external=0 → 保留发送消息', () => {
      expect(
        shouldHideSendButton({
          isSelf: false,
          viewerSpaceId: 'space-A',
          subscriberOrgData: { is_external: 0 },
        })
      ).toBe(false);
    });
  });

  describe('数据源降级：subscriber 缺失时回落到 channelInfo.orgData', () => {
    it('subscriber 无数据、channelInfo 显示外部 → 隐藏', () => {
      expect(
        shouldHideSendButton({
          isSelf: false,
          viewerSpaceId: 'space-A',
          subscriberOrgData: undefined,
          channelOrgData: { home_space_id: 'space-C' },
        })
      ).toBe(true);
    });

    it('subscriber 显示外部 > channelInfo 显示内部 → 按 subscriber 隐藏', () => {
      expect(
        shouldHideSendButton({
          isSelf: false,
          viewerSpaceId: 'space-A',
          subscriberOrgData: { home_space_id: 'space-D' },
          channelOrgData: { home_space_id: 'space-A' },
        })
      ).toBe(true);
    });
  });

  describe('1v1 / 无群上下文', () => {
    it('subscriber 与 channelInfo 都无归属信息 → 非外部（保留按钮）', () => {
      expect(
        shouldHideSendButton({
          isSelf: false,
          viewerSpaceId: 'space-A',
          subscriberOrgData: undefined,
          channelOrgData: undefined,
        })
      ).toBe(false);
    });
  });

  describe('视角相对性回归：同/跨 space 四组验收', () => {
    const user = { home_space_id: 'space-B', home_space_name: 'SpaceB' };

    it('viewer=space-A 看 user(home=B) → 外部，隐藏', () => {
      expect(
        shouldHideSendButton({ isSelf: false, viewerSpaceId: 'space-A', subscriberOrgData: user })
      ).toBe(true);
    });

    it('viewer=space-B 看 user(home=B) → 内部，保留', () => {
      expect(
        shouldHideSendButton({ isSelf: false, viewerSpaceId: 'space-B', subscriberOrgData: user })
      ).toBe(false);
    });

    it('viewer=space-B 看自己 → 内部，保留（但 isSelf 层也会兜底）', () => {
      expect(
        shouldHideSendButton({ isSelf: true, viewerSpaceId: 'space-B', subscriberOrgData: user })
      ).toBe(false);
    });

    it('viewer=space-C（与双方都不同）看 user(home=B) → 外部，隐藏', () => {
      expect(
        shouldHideSendButton({ isSelf: false, viewerSpaceId: 'space-C', subscriberOrgData: user })
      ).toBe(true);
    });
  });
});
