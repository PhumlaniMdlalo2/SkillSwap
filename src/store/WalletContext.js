import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import * as api from '../services/api';

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setTransactions([]);
      return;
    }
    setLoading(true);
    try {
      const [walletData, txData] = await Promise.all([
        api.getWallet(user.user_id),
        api.getTransactions(user.user_id),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = {
    balance: wallet?.balance ?? 0,
    wallet,
    transactions,
    loading,
    refresh,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
