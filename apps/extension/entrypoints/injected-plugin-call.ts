/**
 * 注入到网页 main world 的脚本，定义 window.pluginCall。
 * 网页代码可以这样调：
 *   window.pluginCall({ type: 'sendMessage', value: '要在划词弹窗里发送的文本' });
 *
 * 转发为 window.postMessage（限定同源），由 cmdk-overlay 的 isolated world
 * content script 监听，触发 cmdk 划词弹窗。
 *
 * 设计目标：
 * - type 字段为未来扩展预留，目前只识别 'sendMessage'，未识别 console.warn 提示
 * - value 必须是非空 string，类型不符也 console.warn 提示，避免接入方静默踩坑
 * - 防重复注入：同一页面多次执行不破坏现有引用
 */

import { normalizePluginCall } from "../utils/pluginCall";

const BOOT_FLAG = "__OCTO_PLUGIN_CALL_BOOTED__";

export default defineUnlistedScript(() => {
  if ((window as any)[BOOT_FLAG]) return;
  (window as any)[BOOT_FLAG] = true;

  (window as any).pluginCall = (payload: unknown) => {
    const result = normalizePluginCall(payload);
    if (!result.ok) {
      console.warn("[Octo] pluginCall ignored:", result.reason, payload);
      return;
    }
    window.postMessage(result.message, window.location.origin);
  };
});
