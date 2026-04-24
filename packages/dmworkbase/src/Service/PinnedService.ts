import APIClient from "./APIClient";
import WKApp from "../App";

export interface PinnedItem {
  channel_id: string;
  channel_type: number;
  sort_order: number;
}

function getSpaceParam() {
  const spaceId = WKApp.shared.currentSpaceId;
  return spaceId ? { space_id: spaceId } : {};
}

export default class PinnedService {
  static shared = new PinnedService();

  async list(): Promise<PinnedItem[]> {
    const resp = await APIClient.shared.get<PinnedItem[]>("user/pinned", {
      param: getSpaceParam(),
    });
    return resp ?? [];
  }

  async add(channelId: string, channelType: number): Promise<void> {
    await APIClient.shared.post(
      `user/pinned?space_id=${encodeURIComponent(WKApp.shared.currentSpaceId || "")}`,
      { channel_id: channelId, channel_type: channelType }
    );
  }

  async remove(channelId: string, channelType: number): Promise<void> {
    await APIClient.shared.delete("user/pinned", {
      param: {
        ...getSpaceParam(),
        channel_id: channelId,
        channel_type: channelType,
      },
    });
  }
}
