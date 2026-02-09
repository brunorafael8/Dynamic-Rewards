import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

export interface Employee {
  id: string;
  name: string;
  point_balance: number;
  onboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RewardRule {
  id: string;
  name: string;
  description?: string;
  event_type: string;
  conditions: Condition[];
  points: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Condition {
  field: string;
  op: string;
  value?: unknown;
}

export interface ProcessResult {
  totalEvents: number;
  rulesEvaluated: number;
  grantsCreated: number;
  totalPointsAwarded: number;
  skippedExisting: number;
  errors: string[];
  durationMs: number;
}

export const fetchRules = async (): Promise<RewardRule[]> => {
  const { data } = await api.get('/rules');
  return data;
};

export const fetchEmployees = async (limit = 20, offset = 0): Promise<{ data: Employee[]; meta: { total: number } }> => {
  const { data } = await api.get(`/employees?limit=${limit}&offset=${offset}`);
  return data;
};

export const createRule = async (rule: {
  name: string;
  description?: string;
  conditions: Condition[];
  points: number;
}): Promise<RewardRule> => {
  const { data } = await api.post('/rules', rule);
  return data;
};

export const processEvents = async (): Promise<ProcessResult> => {
  const { data } = await api.post('/events/process-all');
  return data;
};

export interface LLMAnalyticsSummary {
  summary: {
    totalCalls: number;
    cachedCalls: number;
    cacheHitRate: string;
    totalCost: string;
    costSavings: string;
    savingsMultiplier: string;
    avgLatency: string;
  };
  complexity: {
    simple: string;
    complex: string;
    ultraComplex: string;
  };
  models: Record<string, number>;
  cache: {
    entries: number;
    totalHits: number;
    avgHitsPerEntry: string;
  };
}

export const fetchLLMAnalytics = async (): Promise<LLMAnalyticsSummary> => {
  const { data } = await api.get('/analytics/llm/summary');
  return data;
};

export const clearLLMAnalytics = async (): Promise<{ message: string }> => {
  const { data } = await api.delete('/analytics/llm');
  return data;
};
