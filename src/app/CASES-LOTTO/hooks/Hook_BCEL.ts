// src/app/CASES-LOTTO/hooks/Hooks_Cases.ts

import { useQuery } from "@tanstack/react-query";
import { BCEL_Service } from "../services/service.bcel";
import { BCEL_KEYS } from "../constants/key_cases";
import { Orders_BCEL, BCEL_STMT_ENTITY, REWARD_BCEL } from "../types/Type_bcel";

const HEAVY_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 20,
  gcTime: 1000 * 60 * 45,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: 0,
};

export const useGet_Order_BCEL = (caseNumber: string) =>
  useQuery<Orders_BCEL | null>({
    queryKey: BCEL_KEYS.order(caseNumber), // ✅ ['bcel', 'order', id]
    queryFn: () => BCEL_Service.fetchById(caseNumber),
    enabled: !!caseNumber,
    ...HEAVY_QUERY_OPTIONS,
  });

export const useGet_Reward_BCEL_STMT = (Key_Seach: string) =>
  useQuery<BCEL_STMT_ENTITY | null>({
    queryKey: BCEL_KEYS.stmt(Key_Seach), // ✅ ['bcel', 'stmt', id]
    queryFn: () => BCEL_Service.fetchByIdSTMT(Key_Seach),
    enabled: !!Key_Seach,
    ...HEAVY_QUERY_OPTIONS,
  });

export const useGet_Reward_BCEL = (Key_Seach: string) =>
  useQuery<REWARD_BCEL | null>({
    queryKey: BCEL_KEYS.reward(Key_Seach), // ✅ ['bcel', 'reward', id]
    queryFn: () => BCEL_Service.fetchById_Reward_BCEL(Key_Seach),
    enabled: !!Key_Seach,
    ...HEAVY_QUERY_OPTIONS,
  });
