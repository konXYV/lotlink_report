// src/app/CASES-LOTTO/hooks/Hooks_Cases.ts

import { useQuery } from "@tanstack/react-query";
import { LDB_Service } from "../services/Service.LDB";
import { User_KEYS } from "../constants/key_cases";
import { user_entity } from "../types/Type_user";

const HEAVY_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 20,
  gcTime: 1000 * 60 * 45,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: 0,
};

export const useGet_loto_user = (caseNumber: string) =>
  useQuery<user_entity | null>({
    queryKey: User_KEYS.order(caseNumber), // ✅ ['ldb', 'order', id]
    queryFn: () => LDB_Service.fetchLotoUser(caseNumber),
    enabled: !!caseNumber,
    ...HEAVY_QUERY_OPTIONS,
  });
