import { useEffect, useRef, useCallback } from 'react';
import { useIdeStore } from '../store/ideStore';
import { apiService } from '../services/apiService';

const DEBOUNCE_MS = 150;

/**
 * Hook that triggers analysis on code change.
 * Debounced to avoid flooding the backend.
 */
export function useAnalysis() {
  const { sourceCode, sessionId, setIsAnalyzing, setAnalysisResult } = useIdeStore();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAnalysis = useCallback(async (code: string, sid: string) => {
    setIsAnalyzing(true);
    try {
      if (apiService.isConnected()) {
        // Prefer WebSocket path (result comes back via subscription)
        await apiService.sendKeystrokeUpdate(sid, code);
      } else {
        // Fallback: direct REST call
        const result = await apiService.analyzeCode(sid, code);
        setAnalysisResult(result);
        setIsAnalyzing(false);
      }
    } catch (e) {
      console.error('[Analysis] Failed:', e);
      setIsAnalyzing(false);
    }
  }, [setIsAnalyzing, setAnalysisResult]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      triggerAnalysis(sourceCode, sessionId);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [sourceCode, sessionId, triggerAnalysis]);
}
