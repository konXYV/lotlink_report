// src/app/CASES-LOTTO/hooks/Hooks_Cases.ts

import { useQuery } from "@tanstack/react-query";
import { LDB_Service } from "../services/Service.LDB";
import { LDB_KEYS } from "../constants/key_cases";
import {
  ORDER_LDB_ENTITY,
  REWARD_LDB_ENTITY,
  STMT_LDB_ENTITY,
} from "../types/Type_Ldb";

const HEAVY_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 20,
  gcTime: 1000 * 60 * 45,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: 0,
};

export const useGet_Order_LDB = (caseNumber: string) =>
  useQuery<ORDER_LDB_ENTITY | null>({
    queryKey: LDB_KEYS.order(caseNumber), // ✅ ['ldb', 'order', id]
    queryFn: () => LDB_Service.fetchOrderById(caseNumber),
    enabled: !!caseNumber,
    ...HEAVY_QUERY_OPTIONS,
  });

export const useGet_Reward_LDB_STMT = (Key_Seach: string) =>
  useQuery<STMT_LDB_ENTITY | null>({
    queryKey: LDB_KEYS.stmt(Key_Seach), // ✅ ['ldb', 'stmt', id]
    queryFn: () => LDB_Service.fetchByIdSTMT(Key_Seach),
    enabled: !!Key_Seach,
    ...HEAVY_QUERY_OPTIONS,
  });

export const useGet_Reward_LDB = (Key_Seach: string) =>
  useQuery<REWARD_LDB_ENTITY | null>({
    queryKey: LDB_KEYS.reward(Key_Seach), // ✅ ['ldb', 'reward', id]
    queryFn: () => LDB_Service.fetchById_Reward_LDB(Key_Seach),
    enabled: !!Key_Seach,
    ...HEAVY_QUERY_OPTIONS,
  });
