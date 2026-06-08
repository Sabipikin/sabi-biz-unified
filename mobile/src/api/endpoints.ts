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
    LIST: '/api/product/campaigns',
    TEMPLATES: '/api/product/templates',
    BROADCASTS: '/api/product/broadcasts',
    SEGMENTS: '/api/product/segments',
  },
  PRODUCT: {
    SUMMARY: '/api/product/analytics/summary',
    LEADS: '/api/product/leads',
    OPPORTUNITIES: '/api/product/opportunities',
    ACTIVITIES: '/api/product/activities',
    ASSISTANTS: '/api/product/assistants',
    KNOWLEDGE: '/api/product/knowledge',
    WORKFLOWS: '/api/product/workflows',
    INTEGRATIONS: '/api/product/integrations',
    WEBHOOKS: '/api/product/webhooks',
    API_KEYS: '/api/product/api-keys',
    BRANDING: '/api/product/branding',
    REPORTS: '/api/product/reports',
    TEAM: '/api/product/team',
    TICKETS: '/api/product/tickets',
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
    OAUTH_URL: '/api/whatsapp/oauth/url',
  },
  WORKFLOWS: {
    LIST: '/api/workflows',
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
