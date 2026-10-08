import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './AuthContext';
import * as api from '../services/api';

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const enabled = Boolean(user);

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.user_id],
    queryFn: () => api.getWallet(user.user_id),
    enabled,
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions', user?.user_id],
    queryFn: () => api.getTransactions(user.user_id),
    enabled,
  });

  // Never rejects: callers (pull-to-refresh, post-booking updates) just fire
  // and forget, and any failure surfaces through `error` instead.
  const refresh = useCallback(async () => {
    if (!user) return;
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    ]);
  }, [queryClient, user]);

  const value = useMemo(
    () => ({
      balance: walletQuery.data?.balance ?? 0,
      wallet: walletQuery.data ?? null,
      transactions: transactionsQuery.data ?? [],
      loading: enabled && (walletQuery.isPending || transactionsQuery.isPending),
      error: walletQuery.error ?? transactionsQuery.error,
      refresh,
    }),
    [
      enabled,
      walletQuery.data,
      walletQuery.isPending,
      walletQuery.error,
      transactionsQuery.data,
      transactionsQuery.isPending,
      transactionsQuery.error,
      refresh,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
