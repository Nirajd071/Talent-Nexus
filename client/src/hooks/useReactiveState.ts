import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Custom hook for automatic data fetching with refetch capability
 * Provides loading states, error handling, and manual/auto refresh
 */
export function useAutoRefetch<T>(
    fetchFn: () => Promise<T>,
    options: {
        immediate?: boolean;      // Fetch on mount
        interval?: number | null; // Auto-refetch interval in ms (null = disabled)
        onSuccess?: (data: T) => void;
        onError?: (error: Error) => void;
    } = {}
) {
    const { immediate = true, interval = null, onSuccess, onError } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const mountedRef = useRef(true);

    const fetch = useCallback(async () => {
        if (!mountedRef.current) return;

        setLoading(true);
        setError(null);

        try {
            const result = await fetchFn();
            if (mountedRef.current) {
                setData(result);
                onSuccess?.(result);
            }
        } catch (err) {
            if (mountedRef.current) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                onError?.(error);
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [fetchFn, onSuccess, onError]);

    // Manual refetch
    const refetch = useCallback(() => {
        return fetch();
    }, [fetch]);

    // Fetch on mount if immediate
    useEffect(() => {
        if (immediate) {
            fetch();
        }
    }, [immediate, fetch]);

    // Auto-refetch interval
    useEffect(() => {
        if (interval && interval > 0) {
            const id = setInterval(fetch, interval);
            return () => clearInterval(id);
        }
    }, [interval, fetch]);

    // Cleanup
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    return {
        data,
        loading,
        error,
        refetch,
        setData // Allow manual state updates for optimistic UI
    };
}

/**
 * Hook for optimistic updates - updates UI immediately, reverts on failure
 */
export function useOptimisticUpdate<T>(
    initialData: T | null,
    updateFn: (newData: T) => Promise<T>,
    options: {
        onSuccess?: (data: T) => void;
        onError?: (error: Error, previousData: T | null) => void;
    } = {}
) {
    const { onSuccess, onError } = options;

    const [data, setData] = useState<T | null>(initialData);
    const [isUpdating, setIsUpdating] = useState(false);
    const previousDataRef = useRef<T | null>(null);

    // Update data when initialData changes
    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const update = useCallback(async (newData: T) => {
        previousDataRef.current = data;
        setData(newData); // Optimistic update
        setIsUpdating(true);

        try {
            const result = await updateFn(newData);
            setData(result); // Update with server response
            onSuccess?.(result);
            return result;
        } catch (err) {
            // Revert on failure
            setData(previousDataRef.current);
            const error = err instanceof Error ? err : new Error(String(err));
            onError?.(error, previousDataRef.current);
            throw error;
        } finally {
            setIsUpdating(false);
        }
    }, [data, updateFn, onSuccess, onError]);

    return {
        data,
        setData,
        update,
        isUpdating
    };
}

/**
 * Hook for managing a list with add/remove/update operations
 */
export function useListState<T extends { _id?: string; id?: string }>(initialItems: T[] = []) {
    const [items, setItems] = useState<T[]>(initialItems);

    // Update when initialItems changes
    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const addItem = useCallback((item: T) => {
        setItems(prev => [item, ...prev]);
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => (item._id || item.id) !== id));
    }, []);

    const updateItem = useCallback((id: string, updates: Partial<T>) => {
        setItems(prev => prev.map(item =>
            (item._id || item.id) === id ? { ...item, ...updates } : item
        ));
    }, []);

    const replaceItems = useCallback((newItems: T[]) => {
        setItems(newItems);
    }, []);

    return {
        items,
        setItems,
        addItem,
        removeItem,
        updateItem,
        replaceItems
    };
}
