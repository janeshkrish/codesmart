import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useIdeStore } from '../store/ideStore';
import type { AnalysisResult, StepResult } from '../types';

// ============================================================
// WebSocket + REST API Service
// ============================================================

const API_BASE = 'http://localhost:8080';
const WS_URL   = 'http://localhost:8080/ws';

// Internal subscription record
interface TopicEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (payload: any) => void;
  subscription?: StompSubscription;
}

class ApiService {
  private stompClient: Client | null = null;

  // All registered topics + their callbacks.
  // Subscriptions are applied/re-applied every time the STOMP connection opens.
  private topics: Map<string, TopicEntry> = new Map();

  // ============================================================
  // REST API
  // ============================================================

  async analyzeCode(sessionId: string, source: string): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, source }),
    });
    if (!response.ok) throw new Error(`Analysis failed: ${response.statusText}`);
    return response.json();
  }

  async sendKeystrokeUpdate(sessionId: string, source: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/analyze/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, source }),
    });
    if (!response.ok) throw new Error(`Update failed: ${response.statusText}`);
  }

  async startExecution(source: string, className: string): Promise<{ executionId: string }> {
    const response = await fetch(`${API_BASE}/api/execution/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, className }),
    });
    if (!response.ok) throw new Error(`Execution start failed`);
    return response.json();
  }

  async stepForward(executionId: string): Promise<{ step: StepResult }> {
    const response = await fetch(`${API_BASE}/api/execution/${executionId}/step`, { method: 'POST' });
    if (!response.ok) throw new Error('Step failed');
    return response.json();
  }

  async stepBackward(executionId: string): Promise<{ step: StepResult }> {
    const response = await fetch(`${API_BASE}/api/execution/${executionId}/step-back`, { method: 'POST' });
    if (!response.ok) throw new Error('Step back failed');
    return response.json();
  }

  async stepInto(executionId: string): Promise<{ step: StepResult }> {
    return this.stepForward(executionId); // Placeholder for actual implementation
  }

  async stepOver(executionId: string): Promise<{ step: StepResult }> {
    return this.stepForward(executionId); // Placeholder
  }

  async stepOut(executionId: string): Promise<{ step: StepResult }> {
    return this.stepForward(executionId); // Placeholder
  }

  async continueExecution(executionId: string): Promise<void> {
    await this.runToCompletion(executionId);
  }

  async runToCompletion(executionId: string): Promise<void> {
    await fetch(`${API_BASE}/api/execution/${executionId}/run`, { method: 'POST' });
  }

  async sendStdin(executionId: string, input: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/execution/${executionId}/stdin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    if (!response.ok) throw new Error('Failed to send stdin');
  }

  async pauseExecution(executionId: string): Promise<void> {
    await fetch(`${API_BASE}/api/execution/${executionId}/pause`, { method: 'POST' });
  }

  async resumeExecution(executionId: string): Promise<void> {
    await fetch(`${API_BASE}/api/execution/${executionId}/resume`, { method: 'POST' });
  }

  async restartExecution(executionId: string): Promise<void> {
    await fetch(`${API_BASE}/api/execution/${executionId}/restart`, { method: 'POST' });
  }

  async stopExecution(executionId: string): Promise<void> {
    await fetch(`${API_BASE}/api/execution/${executionId}`, { method: 'DELETE' });
  }

  // ============================================================
  // WebSocket Connection
  // ============================================================

  connect(): void {
    if (this.stompClient?.active) return;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,

      onConnect: () => {
        console.log('[WS] Connected');
        useIdeStore.getState().setWsConnected(true);
        // Apply ALL registered subscriptions now that we have a live connection
        this.applyAllSubscriptions();
      },

      onDisconnect: () => {
        console.log('[WS] Disconnected');
        useIdeStore.getState().setWsConnected(false);
        // Clear live subscription handles; callbacks stay registered so
        // they are re-applied automatically on the next reconnect.
        this.topics.forEach((entry) => {
          entry.subscription = undefined;
        });
      },

      onStompError: (frame) => {
        console.error('[WS] STOMP error:', frame);
      },
    });

    this.stompClient.activate();
  }

  disconnect(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
    this.topics.clear();
  }

  // ============================================================
  // Subscriptions
  // ============================================================

  /**
   * Subscribe to analysis results for a session.
   * Safe to call at any time — queued until the connection is live.
   */
  subscribeToAnalysis(
    sessionId: string,
    callback: (result: AnalysisResult) => void,
  ): () => void {
    const topic = `/topic/analysis/${sessionId}`;
    return this.register(topic, callback);
  }

  /**
   * Subscribe to step-by-step execution events.
   * Safe to call at any time — queued until the connection is live.
   */
  subscribeToExecution(
    executionId: string,
    callback: (step: StepResult) => void,
  ): () => void {
    const topic = `/topic/execution/${executionId}`;
    return this.register(topic, callback);
  }

  isConnected(): boolean {
    return this.stompClient?.connected ?? false;
  }

  // ============================================================
  // Internals
  // ============================================================

  /**
   * Register a topic+callback pair.
   * If already connected, subscribe immediately.
   * Returns an unsubscribe function.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private register(topic: string, callback: (payload: any) => void): () => void {
    // Store the entry (overwriting if already registered)
    const entry: TopicEntry = { callback };
    this.topics.set(topic, entry);

    // If we already have a live connection, subscribe immediately.
    // NOTE: check `connected` (STOMP handshake complete), NOT `active` (just activated).
    if (this.stompClient?.connected) {
      entry.subscription = this.subscribeOnClient(topic, callback);
    }

    return () => {
      const e = this.topics.get(topic);
      e?.subscription?.unsubscribe();
      this.topics.delete(topic);
    };
  }

  /** Apply all registered topic callbacks onto the live STOMP connection. */
  private applyAllSubscriptions(): void {
    this.topics.forEach((entry, topic) => {
      if (!entry.subscription) {
        entry.subscription = this.subscribeOnClient(topic, entry.callback);
      }
    });
  }

  /** Create a single STOMP subscription, safely. */
  private subscribeOnClient(
    topic: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (payload: any) => void,
  ): StompSubscription | undefined {
    if (!this.stompClient?.connected) return undefined;
    try {
      return this.stompClient.subscribe(topic, (message: IMessage) => {
        try {
          callback(JSON.parse(message.body));
        } catch (e) {
          console.error('[WS] Parse error for topic', topic, e);
        }
      });
    } catch (e) {
      console.error('[WS] Subscribe error for topic', topic, e);
      return undefined;
    }
  }
}

export const apiService = new ApiService();
