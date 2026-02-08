import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

// TODO: Change to your backend URL (update before deploying)
const API_BASE_URL = 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

// API response types
export interface Profile {
  id: string;
  name: string;
  pointBalance: number;
  onboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RewardRule {
  id: string;
  name: string;
  description?: string;
  eventType: string;
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
  totalVisits: number;
  totalRulesEvaluated: number;
  grantsCreated: number;
  totalPointsAwarded: number;
  skippedExisting: number;
  errors: string[];
  durationMs: number;
}

// API functions
export const fetchRules = async (): Promise<RewardRule[]> => {
  const { data } = await api.get('/rules');
  return data;
};

export const fetchProfiles = async (limit = 20, offset = 0): Promise<{ data: Profile[]; meta: { total: number } }> => {
  const { data } = await api.get(`/profiles?limit=${limit}&offset=${offset}`);
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

export const processVisits = async (): Promise<ProcessResult> => {
  const { data } = await api.post('/events/process-all');
  return data;
};
