"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RewardRule } from "@dynamic-rewards/shared/types";
import type { CreateRuleInput, UpdateRuleInput } from "@dynamic-rewards/shared/schemas";
import { api } from "../api";
import { queryKeys } from "../query-keys";

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number };
}

export function useRules(
  filters?: { active?: boolean },
  limit = 50,
  offset = 0
) {
  return useQuery({
    queryKey: queryKeys.rules.list(filters),
    queryFn: async (): Promise<PaginatedResponse<RewardRule>> => {
      const params = new URLSearchParams();
      if (filters?.active !== undefined)
        params.set("active", String(filters.active));
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      const { data } = await api.get(`/rules?${params}`);
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useRule(id: string) {
  return useQuery({
    queryKey: queryKeys.rules.detail(id),
    queryFn: async (): Promise<RewardRule> => {
      const { data } = await api.get(`/rules/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRuleInput): Promise<RewardRule> => {
      const { data } = await api.post("/rules", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateRuleInput & { id: string }): Promise<RewardRule> => {
      const { data } = await api.put(`/rules/${id}`, input);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.rules.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<RewardRule> => {
      const { data } = await api.delete(`/rules/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
