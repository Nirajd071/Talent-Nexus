/**
 * Client-side Proctoring Hook
 * Captures user events and reports to server
 */

import { useEffect, useCallback, useRef, useState } from "react";

interface ProctoringEvent {
    eventType: string;
    severity: "low" | "medium" | "high" | "critical";
    metadata?: Record<string, unknown>;
    questionIndex?: number;
    timeIntoPractice?: number;
}

interface UseProctoringOptions {
    submissionId: string;
    sessionId?: string;
    enabled?: boolean;
    onEvent?: (event: ProctoringEvent) => void;
    apiEndpoint?: string;
}

interface ProctoringStats {
    tabSwitches: number;
    focusLosses: number;
    pasteEvents: number;
    copyEvents: number;
    currentIntegrity: number;
}

export function useProctoring({
    submissionId,
    sessionId,
    enabled = true,
    onEvent,
    apiEndpoint = "/api/proctoring/event",
}: UseProctoringOptions) {
    const [stats, setStats] = useState<ProctoringStats>({
        tabSwitches: 0,
        focusLosses: 0,
        pasteEvents: 0,
        copyEvents: 0,
        currentIntegrity: 100,
    });

    const startTimeRef = useRef<number>(Date.now());
    const eventQueueRef = useRef<ProctoringEvent[]>([]);
    const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate time into practice
    const getTimeIntoPractice = useCallback(() => {
        return Math.floor((Date.now() - startTimeRef.current) / 1000);
    }, []);

    // Queue and send events
    const sendEvent = useCallback(async (event: ProctoringEvent) => {
        if (!enabled) return;

        // Add to queue
        eventQueueRef.current.push(event);

        // Notify callback
        onEvent?.(event);

        // Update local stats
        setStats((prev) => {
            const updates: Partial<ProctoringStats> = {};

            switch (event.eventType) {
                case "tab_switch":
                    updates.tabSwitches = prev.tabSwitches + 1;
                    updates.currentIntegrity = Math.max(0, prev.currentIntegrity - 5);
                    break;
                case "focus_loss":
                    updates.focusLosses = prev.focusLosses + 1;
                    updates.currentIntegrity = Math.max(0, prev.currentIntegrity - 3);
                    break;
                case "paste":
                    updates.pasteEvents = prev.pasteEvents + 1;
                    updates.currentIntegrity = Math.max(0, prev.currentIntegrity - 10);
                    break;
                case "copy":
                    updates.copyEvents = prev.copyEvents + 1;
                    updates.currentIntegrity = Math.max(0, prev.currentIntegrity - 8);
                    break;
            }

            return { ...prev, ...updates };
        });

        // Debounced flush to server
        if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
        }

        flushTimeoutRef.current = setTimeout(async () => {
            const events = eventQueueRef.current;
            eventQueueRef.current = [];

            for (const evt of events) {
                try {
                    await fetch(apiEndpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            submissionId,
                            sessionId,
                            ...evt,
                        }),
                    });
                } catch (error) {
                    console.error("Failed to send proctoring event:", error);
                }
            }
        }, 500);
    }, [enabled, submissionId, sessionId, apiEndpoint, onEvent]);

    // Visibility change (tab switch)
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                sendEvent({
                    eventType: "tab_switch",
                    severity: "medium",
                    timeIntoPractice: getTimeIntoPractice(),
                    metadata: { visibilityState: document.visibilityState },
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [enabled, sendEvent, getTimeIntoPractice]);

    // Focus/blur events
    useEffect(() => {
        if (!enabled) return;

        const handleBlur = () => {
            sendEvent({
                eventType: "focus_loss",
                severity: "low",
                timeIntoPractice: getTimeIntoPractice(),
            });
        };

        window.addEventListener("blur", handleBlur);
        return () => window.removeEventListener("blur", handleBlur);
    }, [enabled, sendEvent, getTimeIntoPractice]);

    // Paste detection
    useEffect(() => {
        if (!enabled) return;

        const handlePaste = (e: ClipboardEvent) => {
            const pastedText = e.clipboardData?.getData("text") || "";
            sendEvent({
                eventType: "paste",
                severity: pastedText.length > 100 ? "high" : "medium",
                timeIntoPractice: getTimeIntoPractice(),
                metadata: {
                    textLength: pastedText.length,
                    hasCode: pastedText.includes("function") || pastedText.includes("const") || pastedText.includes("class"),
                },
            });
        };

        document.addEventListener("paste", handlePaste);
        return () => document.removeEventListener("paste", handlePaste);
    }, [enabled, sendEvent, getTimeIntoPractice]);

    // Copy detection
    useEffect(() => {
        if (!enabled) return;

        const handleCopy = () => {
            sendEvent({
                eventType: "copy",
                severity: "medium",
                timeIntoPractice: getTimeIntoPractice(),
            });
        };

        document.addEventListener("copy", handleCopy);
        return () => document.removeEventListener("copy", handleCopy);
    }, [enabled, sendEvent, getTimeIntoPractice]);

    // Right-click detection
    useEffect(() => {
        if (!enabled) return;

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            sendEvent({
                eventType: "right_click",
                severity: "low",
                timeIntoPractice: getTimeIntoPractice(),
            });
        };

        document.addEventListener("contextmenu", handleContextMenu);
        return () => document.removeEventListener("contextmenu", handleContextMenu);
    }, [enabled, sendEvent, getTimeIntoPractice]);

    // Keyboard shortcut detection (DevTools, etc.)
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Detect DevTools shortcuts
            if (
                (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
                e.key === "F12"
            ) {
                e.preventDefault();
                sendEvent({
                    eventType: "dev_tools",
                    severity: "critical",
                    timeIntoPractice: getTimeIntoPractice(),
                    metadata: { key: e.key },
                });
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [enabled, sendEvent, getTimeIntoPractice]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (flushTimeoutRef.current) {
                clearTimeout(flushTimeoutRef.current);
            }
        };
    }, []);

    return {
        stats,
        sendEvent,
        reset: () => {
            startTimeRef.current = Date.now();
            setStats({
                tabSwitches: 0,
                focusLosses: 0,
                pasteEvents: 0,
                copyEvents: 0,
                currentIntegrity: 100,
            });
        },
    };
}

export default useProctoring;
