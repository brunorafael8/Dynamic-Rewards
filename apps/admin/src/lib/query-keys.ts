export const queryKeys = {
  rules: {
    all: ["rules"] as const,
    lists: () => [...queryKeys.rules.all, "list"] as const,
    list: (filters?: { active?: boolean }) =>
      [...queryKeys.rules.lists(), filters] as const,
    details: () => [...queryKeys.rules.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.rules.details(), id] as const,
  },
  employees: {
    all: ["employees"] as const,
    lists: () => [...queryKeys.employees.all, "list"] as const,
    list: (params?: { limit?: number; offset?: number }) =>
      [...queryKeys.employees.lists(), params] as const,
    details: () => [...queryKeys.employees.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
  },
  processing: {
    all: ["processing"] as const,
    results: () => [...queryKeys.processing.all, "results"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    metrics: () => [...queryKeys.dashboard.all, "metrics"] as const,
  },
} as const;
