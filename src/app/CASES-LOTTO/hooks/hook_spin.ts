// src/app/CASES-LOTTO/hooks/Hooks_Cases.ts

import { useQuery } from "@tanstack/react-query";
import { BCEL_Service } from "../services/service_spin";
import { SPIN_KEYS } from "../constants/key_cases";
import { ORDER_SPIN_ENTITY, STMT_SPIN_ENTITY } from "../types/Type_spin";

const HEAVY_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 20,
  gcTime: 1000 * 60 * 45,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: 0,
};

export const useGet_Order_SPIN = (caseNumber: string) =>
  useQuery<ORDER_SPIN_ENTITY | null>({
    queryKey: SPIN_KEYS.order(caseNumber), // ✅ ['spin', 'order', id]
    queryFn: () => BCEL_Service.fetchSpinById(caseNumber),
    enabled: !!caseNumber,
    ...HEAVY_QUERY_OPTIONS,
  });

export const useGet_Stmt_SPIN = (caseNumber: string) =>
  useQuery<STMT_SPIN_ENTITY | null>({
    queryKey: SPIN_KEYS.stmt(caseNumber), // ✅ ['spin', 'stmt', id]
    queryFn: () => BCEL_Service.fetchSpinStmtById(caseNumber),
    enabled: !!caseNumber,
    ...HEAVY_QUERY_OPTIONS,
  });
