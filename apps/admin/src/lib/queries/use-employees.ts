"use client";

import { useQuery } from "@tanstack/react-query";
import type { Employee } from "@dynamic-rewards/shared/types";
import { api } from "../api";
import { queryKeys } from "../query-keys";

interface EmployeeWithGrants extends Employee {
  grants: Array<{
    id: string;
    ruleName: string;
    pointsAwarded: number;
    event_id: string;
    createdAt: string;
  }>;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number };
}

export function useEmployees(limit = 20, offset = 0) {
  return useQuery({
    queryKey: queryKeys.employees.list({ limit, offset }),
    queryFn: async (): Promise<PaginatedResponse<Employee>> => {
      const { data } = await api.get(
        `/employees?limit=${limit}&offset=${offset}`
      );
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: async (): Promise<EmployeeWithGrants> => {
      const { data } = await api.get(`/employees/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
