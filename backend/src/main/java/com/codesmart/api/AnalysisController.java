package com.codesmart.api;

import com.codesmart.analyzer.SemanticAnalyzer;
import com.codesmart.model.AnalysisResult;
import com.codesmart.parser.AstNodeBuilder;
import com.codesmart.parser.IncrementalJavaParser;
import com.codesmart.parser.ParsedResult;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.*;

/**
 * REST controller for code analysis.
 * POST /api/analyze - analyze source code and return full result.
 * POST /api/analyze/stream - analyze and broadcast via WebSocket.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class AnalysisController {

    private final IncrementalJavaParser javaParser;
    private final SemanticAnalyzer semanticAnalyzer;
    private final SimpMessagingTemplate messagingTemplate;

    // Debounced executor per session
    private final ConcurrentHashMap<String, ScheduledFuture<?>> pendingAnalysis = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);

    /**
     * Synchronous analysis - returns full result immediately.
     */
    @PostMapping("/analyze")
    public ResponseEntity<AnalysisResult> analyze(@RequestBody AnalyzeRequest request) {
        log.debug("Analyze request: session={} len={}", request.sessionId(), request.source().length());

        ParsedResult parsed = javaParser.parse(request.sessionId(), request.source());
        AnalysisResult result = semanticAnalyzer.analyze(parsed);

        // Also build AST tree
        if (parsed.getCompilationUnit() != null) {
            AstNodeBuilder astBuilder = new AstNodeBuilder();
            result.setAstRoot(parsed.getCompilationUnit().accept(astBuilder, null));
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Keystroke update - debounced 150ms, broadcasts via WebSocket.
     */
    @PostMapping("/analyze/update")
    public ResponseEntity<Map<String, String>> analyzeUpdate(@RequestBody AnalyzeRequest request) {
        String sessionId = request.sessionId();

        // Cancel any pending analysis for this session
        ScheduledFuture<?> existing = pendingAnalysis.remove(sessionId);
        if (existing != null) existing.cancel(false);

        // Schedule new analysis after debounce
        ScheduledFuture<?> future = scheduler.schedule(() -> {
            try {
                ParsedResult parsed = javaParser.parse(sessionId, request.source());
                AnalysisResult result = semanticAnalyzer.analyze(parsed);

                if (parsed.getCompilationUnit() != null) {
                    AstNodeBuilder astBuilder = new AstNodeBuilder();
                    result.setAstRoot(parsed.getCompilationUnit().accept(astBuilder, null));
                }

                // Broadcast to all subscribers of this session
                messagingTemplate.convertAndSend("/topic/analysis/" + sessionId, result);
                log.debug("Analysis broadcast: session={} parseSuccess={}", sessionId, result.isParseSuccess());
            } catch (Exception e) {
                log.error("Analysis error for session {}", sessionId, e);
            } finally {
                pendingAnalysis.remove(sessionId);
            }
        }, 150, TimeUnit.MILLISECONDS);

        pendingAnalysis.put(sessionId, future);

        return ResponseEntity.accepted().body(Map.of(
                "status", "queued",
                "sessionId", sessionId
        ));
    }

    /**
     * Health check
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "version", "1.0.0"));
    }

    public record AnalyzeRequest(
            @NotNull String sessionId,
            @NotNull String source,
            String fileName
    ) {}
}
