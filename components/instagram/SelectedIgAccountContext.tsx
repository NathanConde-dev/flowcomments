'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type IgAccountSummary = {
  id: string;
  username: string;
  userId: string;
  profilePictureUrl?: string | null;
};

type SelectedIgAccountContextValue = {
  accounts: IgAccountSummary[];
  selectedAccountId: string | null;
  selectedAccount: IgAccountSummary | null;
  setSelectedAccountId: (id: string) => void;
};

const STORAGE_KEY = 'fc-selected-ig-account';

const SelectedIgAccountContext =
  createContext<SelectedIgAccountContextValue | null>(null);

export function SelectedIgAccountProvider({
  accounts,
  children,
}: {
  accounts: IgAccountSummary[];
  children: React.ReactNode;
}) {
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(
    accounts[0]?.id ?? null
  );

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedAccountIdState(null);
      return;
    }

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignore
    }

    const next =
      (saved && accounts.some((account) => account.id === saved) && saved) ||
      accounts[0].id;

    setSelectedAccountIdState(next);
  }, [accounts]);

  const setSelectedAccountId = useCallback((id: string) => {
    setSelectedAccountIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const value = useMemo(
    () => ({
      accounts,
      selectedAccountId,
      selectedAccount,
      setSelectedAccountId,
    }),
    [accounts, selectedAccountId, selectedAccount, setSelectedAccountId]
  );

  return (
    <SelectedIgAccountContext.Provider value={value}>
      {children}
    </SelectedIgAccountContext.Provider>
  );
}

export function useSelectedIgAccount() {
  const ctx = useContext(SelectedIgAccountContext);
  if (!ctx) {
    throw new Error(
      'useSelectedIgAccount must be used within SelectedIgAccountProvider'
    );
  }
  return ctx;
}
