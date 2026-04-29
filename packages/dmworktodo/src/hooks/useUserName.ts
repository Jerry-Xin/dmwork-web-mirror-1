import { useState, useEffect } from 'react';
import WKSDK, { Channel, ChannelTypePerson } from 'wukongimjssdk';
import type { ChannelInfo } from 'wukongimjssdk';

/**
 * Resolve a user_id to a display name via WKSDK channel info.
 * Returns the cached title if available, otherwise fetches it asynchronously.
 * Falls back to a truncated uid if lookup fails.
 */
export function useUserName(uid: string): string {
  const [name, setName] = useState<string>(() => {
    const info = WKSDK.shared().channelManager.getChannelInfo(new Channel(uid, ChannelTypePerson));
    return info?.title || '';
  });

  useEffect(() => {
    if (!uid) return;
    let aborted = false;

    const channel = new Channel(uid, ChannelTypePerson);
    const cached = WKSDK.shared().channelManager.getChannelInfo(channel);
    if (cached?.title) {
      setName(cached.title);
      return;
    }

    // Listen for channel info updates
    const listener = (channelInfo: ChannelInfo) => {
      if (
        !aborted &&
        channelInfo.channel.channelID === uid &&
        channelInfo.channel.channelType === ChannelTypePerson
      ) {
        setName(channelInfo.title || uid);
      }
    };

    WKSDK.shared().channelManager.addListener(listener);
    // Trigger async fetch; on failure set fallback name
    WKSDK.shared().channelManager.fetchChannelInfo(channel).catch(() => {
      if (!aborted) setName((prev) => prev || uid);
    });

    return () => {
      aborted = true;
      WKSDK.shared().channelManager.removeListener(listener);
    };
  }, [uid]);

  if (name) return name;
  // Fallback: show first 8 chars of uid
  return uid.length > 8 ? `${uid.slice(0, 8)}…` : uid;
}

/**
 * Batch-resolve multiple user_ids. Returns a Map<uid, displayName>.
 */
export function useUserNames(uids: string[]): Map<string, string> {
  const [nameMap, setNameMap] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const uid of uids) {
      const info = WKSDK.shared().channelManager.getChannelInfo(new Channel(uid, ChannelTypePerson));
      m.set(uid, info?.title || '');
    }
    return m;
  });

  useEffect(() => {
    if (uids.length === 0) return;
    let aborted = false;

    const channels = uids.map((uid) => new Channel(uid, ChannelTypePerson));

    // Initial resolve from cache
    const m = new Map<string, string>();
    const toFetch: Channel[] = [];
    for (let i = 0; i < uids.length; i++) {
      const info = WKSDK.shared().channelManager.getChannelInfo(channels[i]);
      if (info?.title) {
        m.set(uids[i], info.title);
      } else {
        m.set(uids[i], '');
        toFetch.push(channels[i]);
      }
    }
    setNameMap(new Map(m));

    // Listen for updates
    const listener = (channelInfo: ChannelInfo) => {
      if (aborted) return;
      const uid = channelInfo.channel.channelID;
      if (channelInfo.channel.channelType === ChannelTypePerson && uids.includes(uid)) {
        setNameMap((prev) => {
          const next = new Map(prev);
          next.set(uid, channelInfo.title || uid);
          return next;
        });
      }
    };

    WKSDK.shared().channelManager.addListener(listener);

    // Fetch uncached; on failure set fallback
    for (const ch of toFetch) {
      WKSDK.shared().channelManager.fetchChannelInfo(ch).catch(() => {
        if (aborted) return;
        setNameMap((prev) => {
          const next = new Map(prev);
          if (!next.get(ch.channelID)) {
            next.set(ch.channelID, ch.channelID);
          }
          return next;
        });
      });
    }

    return () => {
      aborted = true;
      WKSDK.shared().channelManager.removeListener(listener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(uids)]);

  return nameMap;
}
