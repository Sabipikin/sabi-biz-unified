export const Endpoints = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
  },
  USERS: {
    LIST: '/api/admin/users',
  },
  LEADS: {
    LIST: '/api/business/customers',
  },
  CAMPAIGNS: {
    LIST: '/api/marketing/campaigns',
  },
  ANALYTICS: {
    DASH: '/api/analytics',
    CUSTOMER_INTELLIGENCE: '/api/analytics/customer-intelligence',
  },
  CONVERSATIONS: {
    LIST: '/api/conversations',
    DETAIL: (id: string | string[]) => `/api/conversations/${id}`,
    REPLY: (id: string | string[]) => `/api/conversations/${id}/reply`,
    ASSIGN: (id: string | string[]) => `/api/conversations/${id}/assign`,
    CLOSE: (id: string | string[]) => `/api/conversations/${id}/close`,
    RESUME_AI: (id: string | string[]) => `/api/conversations/${id}/resume-ai`,
  },
  AI: {
    SETTINGS: '/api/ai/settings',
  },
  WHATSAPP: {
    ACCOUNTS: '/api/whatsapp/accounts',
  },
  BILLING: {
    CURRENT_PLAN: '/api/billing/current-plan',
    USAGE: '/api/billing/usage',
    INVOICES: '/api/billing/invoices',
    UPGRADE: '/api/billing/upgrade',
    DOWNGRADE: '/api/billing/downgrade',
    CANCEL: '/api/billing/cancel',
    REACTIVATE: '/api/billing/reactivate',
  },
};
