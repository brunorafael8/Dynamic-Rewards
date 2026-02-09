/**
 * Centralized TanStack Query keys
 * Prevents typos and makes key management easier
 */

export const queryKeys = {
  rules: {
    all: ['rules'] as const,
    lists: () => [...queryKeys.rules.all, 'list'] as const,
    list: (filters?: { active?: boolean }) =>
      [...queryKeys.rules.lists(), filters] as const,
    details: () => [...queryKeys.rules.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.rules.details(), id] as const,
  },

  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (limit?: number, offset?: number) =>
      [...queryKeys.employees.lists(), { limit, offset }] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
  },

  processing: {
    all: ['processing'] as const,
    results: () => [...queryKeys.processing.all, 'results'] as const,
  },

  llm: {
    all: ['llm'] as const,
    analytics: ['llm', 'analytics'] as const,
  },
} as const;
