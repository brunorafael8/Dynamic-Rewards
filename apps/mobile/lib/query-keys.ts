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

  profiles: {
    all: ['profiles'] as const,
    lists: () => [...queryKeys.profiles.all, 'list'] as const,
    list: (limit?: number, offset?: number) =>
      [...queryKeys.profiles.lists(), { limit, offset }] as const,
    details: () => [...queryKeys.profiles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.profiles.details(), id] as const,
  },

  processing: {
    all: ['processing'] as const,
    results: () => [...queryKeys.processing.all, 'results'] as const,
  },
} as const;
