// src/app/CASES-LOTTO/hooks/Hooks_Cases.ts

import { useQuery } from "@tanstack/react-query";
import { JDB_Service } from "../services/Service.jdb";
import { JDB_KEYS } from "../constants/key_cases";
import { JDB_STMT_ENTITY } from "../types/Type_Jdb";

const HEAVY_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 20,
  gcTime: 1000 * 60 * 45,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: 0,
};

export const useGet_Reward_JDB_STMT = (Key_Seach: string) =>
  useQuery<JDB_STMT_ENTITY | null>({
    queryKey: JDB_KEYS.stmt(Key_Seach), // ✅ ['jdb', 'stmt', id]
    queryFn: () => JDB_Service.useGet_Reward_JDB_STMT(Key_Seach),
    enabled: !!Key_Seach,
    ...HEAVY_QUERY_OPTIONS,
  });
