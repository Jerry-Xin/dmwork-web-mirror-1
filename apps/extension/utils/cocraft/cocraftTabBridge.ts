import { cocraftLog } from "./cocraftLogger";

const chromeApi = (globalThis as { chrome?: any }).chrome;

export interface CocraftBridgePayload {
  agentToken: string;
  projectId: string;
  message: string;
}

export interface CocraftBridgeResult {
  success: boolean;
  toolResultMessage?: string;
  error?: string;
}

export async function getActiveTab(): Promise<{ id?: number; url?: string } | null> {
  try {
    const tabs = await chromeApi.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs?.[0] ?? null;
    cocraftLog.step('background', 'TAB查找', `tabs.query 返回 ${tabs?.length ?? 0} 个`, { tabId: tab?.id, url: tab?.url });
    return tab;
  } catch (err) {
    cocraftLog.err('background', 'TAB查找', 'tabs.query 失败', err);
    return null;
  }
}

export function extractProjectId(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("projectId");
  } catch {
    return null;
  }
}

export async function executeOnCocraftTab(
  tabId: number,
  payload: CocraftBridgePayload,
): Promise<CocraftBridgeResult> {
  if (!chromeApi?.scripting?.executeScript) {
    cocraftLog.err('background', 'BRIDGE', '当前浏览器不支持 scripting API');
    return { success: false, error: "当前浏览器不支持 scripting API" };
  }

  cocraftLog.step('background', 'BRIDGE', `executeScript(tabId=${tabId}, world=MAIN)`, {
    agentToken: payload.agentToken,
    projectId: payload.projectId,
    msgLen: payload.message.length,
  });

  try {
    const results = await chromeApi.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [payload],
      func: (p: any) => {
        const cocraft = (window as any).__cocraft;
        if (!cocraft || typeof cocraft.handleAgentMessage !== "function") {
          return {
            success: false,
            error: "当前页面不是 CoCraft 编辑器，或编辑器尚未就绪",
          };
        }
        return cocraft.handleAgentMessage({
          agentToken: p.agentToken,
          projectId: p.projectId,
          message: p.message,
        });
      },
    });

    const result = results?.[0]?.result;
    if (result) {
      cocraftLog.step('background', 'BRIDGE', `executeScript 返回`, result);
    } else {
      cocraftLog.warn('background', 'BRIDGE', 'executeScript 返回值为空');
    }
    return (result as CocraftBridgeResult) ?? {
      success: false,
      error: "executeScript 返回值为空",
    };
  } catch (err: any) {
    cocraftLog.err('background', 'BRIDGE', `executeScript 异常: ${err?.message || String(err)}`);
    return {
      success: false,
      error: `executeScript 失败: ${err?.message || String(err)}`,
    };
  }
}
