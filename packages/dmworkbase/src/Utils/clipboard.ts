// 复制文本到剪贴板。优先使用 navigator.clipboard，不可用时降级到 textarea + execCommand("copy")，
// 适配 iOS Safari、非 HTTPS 等不支持 Clipboard API 的环境。返回是否复制成功。
export async function copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // fall through to fallback
        }
    }

    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        return ok;
    } catch {
        return false;
    }
}
