export const DEFAULT_API_URL = 'https://api.botgate.cn/v1/'

export const STORAGE_KEYS = {
  TOKEN: 'octo_token',
  USER: 'octo_user',
  SETTINGS: 'octo_settings',
  CURRENT_THREAD: 'octo_current_thread',
}

export const DEFAULT_BLACKLIST = [
  'accounts.google.com',
  'accounts.youtube.com',
  'login.microsoftonline.com',
  'login.live.com',
  'auth0.com',
  'onepassword.com',
  'lastpass.com',
  'bitwarden.com',
]

export const DEFAULT_OCTO_WEB_DOMAINS = [
  'octo.botgate.cn',
  'dmwork.botgate.cn',
  'localhost',
]

export const DEFAULT_SETTINGS = {
  apiUrl: DEFAULT_API_URL,
  octoWebDomains: DEFAULT_OCTO_WEB_DOMAINS,
  blacklist: DEFAULT_BLACKLIST,
  sidebarWidth: 380,
  floatingButtonY: 0.45,
  theme: 'auto',
  muted: false,
  demoMode: true,
}

export const CHANNEL_TYPE = {
  PERSON: 1,
  GROUP: 2,
  THREAD: 3,
  COMMUNITY_TOPIC: 5,
}

export const POLL_INTERVAL = 5000

export const LIMITS = {
  SELECTION_PREVIEW: 500,
  TITLE_DISPLAY: 60,
  INPUT_MAX: 2000,
  MESSAGE_PAGE_SIZE: 20,
}
