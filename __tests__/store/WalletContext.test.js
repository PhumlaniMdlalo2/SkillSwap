import React, { useContext } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletContext, WalletProvider } from '../../src/store/WalletContext';
import { AuthContext } from '../../src/store/AuthContext';
import * as api from '../../src/services/api';

jest.mock('../../src/services/api', () => ({
  getWallet: jest.fn(),
  getTransactions: jest.fn(),
}));

jest.mock('../../src/store/AuthContext', () => ({
  AuthContext: require('react').createContext(null),
}));

let activeClient;

function makeWrapper(user) {
  return function Wrapper({ children }) {
    return (
      <AuthContext.Provider value={{ user }}>
        <QueryClientProvider client={activeClient}>
          <WalletProvider>{children}</WalletProvider>
        </QueryClientProvider>
      </AuthContext.Provider>
    );
  };
}

const authenticatedWrapper = makeWrapper({ user_id: 'u1' });
const anonymousWrapper = makeWrapper(null);

describe('WalletProvider', () => {
  beforeEach(() => {
    api.getWallet.mockReset();
    api.getTransactions.mockReset();
    activeClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
    });
  });

  afterEach(() => {
    activeClient.clear();
  });

  it('fetches wallet balance and transactions for the logged-in user', async () => {
    api.getWallet.mockResolvedValue({ balance: 7 });
    api.getTransactions.mockResolvedValue([{ id: 't1' }]);

    const { result } = await renderHook(() => useContext(WalletContext), {
      wrapper: authenticatedWrapper,
    });

    await waitFor(() => expect(result.current.balance).toBe(7));
    expect(api.getWallet).toHaveBeenCalledWith('u1');
    expect(api.getTransactions).toHaveBeenCalledWith('u1');
    expect(result.current.transactions).toEqual([{ id: 't1' }]);
    expect(result.current.loading).toBe(false);
  });

  it('defaults the balance to zero when the wallet row is missing', async () => {
    api.getWallet.mockResolvedValue(null);
    api.getTransactions.mockResolvedValue([]);

    const { result } = await renderHook(() => useContext(WalletContext), {
      wrapper: authenticatedWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.wallet).toBeNull();
    expect(result.current.balance).toBe(0);
  });

  it('stays empty for anonymous users without calling the api', async () => {
    const { result } = await renderHook(() => useContext(WalletContext), {
      wrapper: anonymousWrapper,
    });

    expect(result.current.balance).toBe(0);
    expect(result.current.transactions).toEqual([]);
    expect(api.getWallet).not.toHaveBeenCalled();
    expect(api.getTransactions).not.toHaveBeenCalled();
  });

  it('refresh reloads wallet data', async () => {
    api.getWallet.mockResolvedValueOnce({ balance: 2 }).mockResolvedValueOnce({ balance: 9 });
    api.getTransactions.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'x' }]);

    const { result } = await renderHook(() => useContext(WalletContext), {
      wrapper: authenticatedWrapper,
    });

    await waitFor(() => expect(result.current.balance).toBe(2));

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.balance).toBe(9));
    await waitFor(() => expect(result.current.transactions).toEqual([{ id: 'x' }]));
  });

  it('refresh never rejects when the api fails', async () => {
    api.getWallet.mockRejectedValue(new Error('network down'));
    api.getTransactions.mockRejectedValue(new Error('network down'));

    const { result } = await renderHook(() => useContext(WalletContext), {
      wrapper: authenticatedWrapper,
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());

    await expect(result.current.refresh()).resolves.toBeUndefined();
  });
});
