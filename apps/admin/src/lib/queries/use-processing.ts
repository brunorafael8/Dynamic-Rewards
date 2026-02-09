"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProcessResult } from "@dynamic-rewards/shared/types";
import { api } from "../api";
import { queryKeys } from "../query-keys";

export function useProcessEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ProcessResult> => {
      const { data } = await api.post("/events/process-all");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.rules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
