package com.codesmart.api;

import com.codesmart.execution.ExecutionEngine;
import com.codesmart.execution.ExecutionSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Execution controller - manages step-through code execution sessions.
 * Uses a sandboxed JVM to execute Java code one statement at a time.
 */
@RestController
@RequestMapping("/api/execution")
@RequiredArgsConstructor
@Slf4j
public class ExecutionController {

    private final ExecutionEngine executionEngine;
    private final SimpMessagingTemplate messagingTemplate;
    private final ConcurrentHashMap<String, ExecutionSession> sessions = new ConcurrentHashMap<>();

    /** Start a new execution session */
    @PostMapping("/start")
    public ResponseEntity<Map<String, String>> startExecution(@RequestBody ExecutionRequest request) {
        String executionId = UUID.randomUUID().toString();
        log.info("Starting execution session: {}", executionId);

        ExecutionSession session = executionEngine.createSession(
                executionId, request.source(), request.className());
        sessions.put(executionId, session);

        return ResponseEntity.ok(Map.of(
                "executionId", executionId,
                "status", "ready",
                "message", "Execution session started. Use /step to step through."
        ));
    }

    /** Step forward one statement */
    @PostMapping("/{executionId}/step")
    public ResponseEntity<Map<String, Object>> stepForward(@PathVariable String executionId) {
        ExecutionSession session = sessions.get(executionId);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        var stepResult = executionEngine.stepForward(session);
        messagingTemplate.convertAndSend("/topic/execution/" + executionId, stepResult);

        return ResponseEntity.ok(Map.of(
                "executionId", executionId,
                "step", stepResult
        ));
    }

    /** Step backward (restore previous state) */
    @PostMapping("/{executionId}/step-back")
    public ResponseEntity<Map<String, Object>> stepBackward(@PathVariable String executionId) {
        ExecutionSession session = sessions.get(executionId);
        if (session == null) return ResponseEntity.notFound().build();

        var stepResult = executionEngine.stepBackward(session);
        messagingTemplate.convertAndSend("/topic/execution/" + executionId, stepResult);

        return ResponseEntity.ok(Map.of("step", stepResult));
    }

    /** Run to completion */
    @PostMapping("/{executionId}/run")
    public ResponseEntity<Void> runToCompletion(@PathVariable String executionId) {
        ExecutionSession session = sessions.get(executionId);
        if (session == null) return ResponseEntity.notFound().build();

        executionEngine.runAsync(session, event ->
                messagingTemplate.convertAndSend("/topic/execution/" + executionId, event));

        return ResponseEntity.accepted().build();
    }

    /** Pause execution */
    @PostMapping("/{executionId}/pause")
    public ResponseEntity<Void> pause(@PathVariable String executionId) {
        ExecutionSession session = sessions.get(executionId);
        if (session != null) executionEngine.pause(session);
        return ResponseEntity.ok().build();
    }

    /** Resume execution */
    @PostMapping("/{executionId}/resume")
    public ResponseEntity<Void> resume(@PathVariable String executionId) {
        ExecutionSession session = sessions.get(executionId);
        if (session != null) executionEngine.resume(session);
        return ResponseEntity.ok().build();
    }

    /** Restart execution */
    @PostMapping("/{executionId}/restart")
    public ResponseEntity<Map<String, String>> restart(@PathVariable String executionId) {
        ExecutionSession session = sessions.get(executionId);
        if (session == null) return ResponseEntity.notFound().build();
        executionEngine.restart(session);
        return ResponseEntity.ok(Map.of("status", "restarted"));
    }

    /** Stop and clean up execution session */
    @DeleteMapping("/{executionId}")
    public ResponseEntity<Void> stopExecution(@PathVariable String executionId) {
        ExecutionSession session = sessions.remove(executionId);
        if (session != null) executionEngine.terminate(session);
        return ResponseEntity.ok().build();
    }

    /** Send stdin to the running process */
    @PostMapping("/{executionId}/stdin")
    public ResponseEntity<Void> sendStdin(@PathVariable String executionId, @RequestBody Map<String, String> payload) {
        ExecutionSession session = sessions.get(executionId);
        if (session != null) {
            String input = payload.get("input");
            executionEngine.sendStdin(session, input);
        }
        return ResponseEntity.ok().build();
    }

    public record ExecutionRequest(String source, String className) {}
}
