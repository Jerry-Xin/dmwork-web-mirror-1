// 白名单：登录态相关 key 前缀，需要跨 tab 共享
const CROSS_TAB_KEYS = ["token", "uid", "short_no", "app_id", "name", "role", "is_work", "sex"];

function isCrossTab(key: string): boolean {
    return CROSS_TAB_KEYS.some(prefix => key.startsWith(prefix));
}

export default class StorageService {
    private constructor() {
    }
    public static shared = new StorageService()

    setItem(key: string, value: string) {
        sessionStorage.setItem(key, value);
        if (isCrossTab(key)) {
            localStorage.setItem(key, value);
        }
    }

    getItem(key: string): string | null {
        const s = sessionStorage.getItem(key);
        if (s !== null) return s;
        return isCrossTab(key) ? localStorage.getItem(key) : null;
    }

    removeItem(key: string) {
        sessionStorage.removeItem(key);
        if (isCrossTab(key)) {
            localStorage.removeItem(key);
        }
    }
}
