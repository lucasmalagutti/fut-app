import { useCallback, useState } from 'react';

/** Pull-to-refresh: chama refetch (uma ou várias queries) e controla o spinner */
export function usePullToRefresh(refetchAll: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  return { refreshing, onRefresh };
}

/** Agrupa vários refetch do React Query */
export function mergeRefetch(...fns: Array<() => Promise<unknown>>) {
  return () => Promise.all(fns.map((fn) => fn()));
}
