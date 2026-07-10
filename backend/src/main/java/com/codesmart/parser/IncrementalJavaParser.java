package com.codesmart.parser;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.Problem;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.symbolsolver.JavaSymbolSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.CombinedTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.ReflectionTypeSolver;
import com.codesmart.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Incremental Java parser engine.
 *
 * Uses JavaParser + JavaSymbolSolver to parse source code into a typed AST.
 * Caches last parse result to enable incremental diffing.
 * Designed to be called on every keystroke (debounced by the caller).
 */
@Component
@Slf4j
public class IncrementalJavaParser {

    private final JavaParser javaParser;
    private final JavaSymbolSolver symbolSolver;

    // Cache of last successful parse result per session
    private final Map<String, CachedParseResult> parseCache = new ConcurrentHashMap<>();
    private final AtomicLong analysisCounter = new AtomicLong(0);

    public IncrementalJavaParser() {
        CombinedTypeSolver typeSolver = new CombinedTypeSolver();
        typeSolver.add(new ReflectionTypeSolver(false));

        this.symbolSolver = new JavaSymbolSolver(typeSolver);

        ParserConfiguration config = new ParserConfiguration();
        config.setSymbolResolver(symbolSolver);
        config.setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_17);
        config.setAttributeComments(true);
        config.setStoreTokens(true);

        this.javaParser = new JavaParser(config);
    }

    /**
     * Parse Java source and return a ParsedResult.
     * If parsing fails, returns a partial result with diagnostics.
     *
     * @param sessionId  unique editor session
     * @param source     current source code
     * @return ParsedResult with CompilationUnit (possibly null on hard failure) and diagnostics
     */
    public ParsedResult parse(String sessionId, String source) {
        long startTime = System.currentTimeMillis();
        String analysisId = "analysis-" + analysisCounter.incrementAndGet();

        log.debug("Parsing session={} len={}", sessionId, source.length());

        // Try to parse - JavaParser is resilient and will produce partial ASTs
        ParseResult<CompilationUnit> result = javaParser.parse(source);

        CompilationUnit cu = result.getResult().orElse(null);
        List<DiagnosticInfo> diagnostics = collectDiagnostics(result.getProblems(), source);

        ParsedResult parsedResult = ParsedResult.builder()
                .analysisId(analysisId)
                .sessionId(sessionId)
                .compilationUnit(cu)
                .diagnostics(diagnostics)
                .parseSuccess(cu != null)
                .sourceCode(source)
                .parseTimeMs(System.currentTimeMillis() - startTime)
                .build();

        if (cu != null) {
            parseCache.put(sessionId, new CachedParseResult(source, parsedResult));
        }

        log.debug("Parse complete: success={} diagnostics={} time={}ms",
                parsedResult.isParseSuccess(), diagnostics.size(), parsedResult.getParseTimeMs());

        return parsedResult;
    }

    /**
     * Converts JavaParser problems into human-readable DiagnosticInfo.
     */
    private List<DiagnosticInfo> collectDiagnostics(List<Problem> problems, String source) {
        List<DiagnosticInfo> diagnostics = new ArrayList<>();
        int counter = 0;

        for (Problem problem : problems) {
            String raw = problem.getMessage();
            DiagnosticSeverity severity = DiagnosticSeverity.ERROR;

            // Map location
            SourceRange range = null;
            if (problem.getLocation().isPresent()) {
                var loc = problem.getLocation().get();
                if (loc.getBegin() != null && loc.getBegin().getRange().isPresent()) {
                    var beginRange = loc.getBegin().getRange().get();
                    int startLine = beginRange.begin.line;
                    int startCol = beginRange.begin.column;
                    int endLine = startLine;
                    int endCol = startCol + 1;
                    if (loc.getEnd() != null && loc.getEnd().getRange().isPresent()) {
                        var endRange = loc.getEnd().getRange().get();
                        endLine = endRange.end.line;
                        endCol = endRange.end.column;
                    }
                    range = SourceRange.builder()
                            .startLine(startLine).startColumn(startCol)
                            .endLine(endLine).endColumn(endCol)
                            .build();
                }
            }

            diagnostics.add(DiagnosticInfo.builder()
                    .id("diag-" + (counter++))
                    .severity(mapSeverity(severity))
                    .rawMessage(raw)
                    .humanMessage(humanizeDiagnostic(raw))
                    .suggestion(suggestFix(raw))
                    .range(range)
                    .build());
        }

        return diagnostics;
    }

    private DiagnosticInfo.DiagnosticSeverity mapSeverity(DiagnosticSeverity s) {
        return switch (s) {
            case ERROR -> DiagnosticInfo.DiagnosticSeverity.ERROR;
            case WARNING -> DiagnosticInfo.DiagnosticSeverity.WARNING;
            case INFO -> DiagnosticInfo.DiagnosticSeverity.INFO;
            case HINT -> DiagnosticInfo.DiagnosticSeverity.HINT;
        };
    }

    /**
     * Converts raw compiler errors into plain English.
     */
    public String humanizeDiagnostic(String raw) {
        if (raw == null) return "Unknown error";

        // Common patterns
        if (raw.contains("';' expected") || raw.contains("expected ';'")) {
            return "You forgot a semicolon (;) at the end of this statement.";
        }
        if (raw.contains("')' expected") || raw.contains("expected ')'")) {
            return "A closing parenthesis ) is missing.";
        }
        if (raw.contains("'}' expected") || raw.contains("expected '}'")) {
            return "A closing curly brace } is missing. Check that all blocks are properly closed.";
        }
        if (raw.contains("'(' expected") || raw.contains("expected '('")) {
            return "An opening parenthesis ( is missing.";
        }
        if (raw.contains("cannot find symbol")) {
            return "This name is not recognized. Check that it's declared and spelled correctly.";
        }
        if (raw.contains("incompatible types")) {
            return "Type mismatch: you're trying to use a value of the wrong type.";
        }
        if (raw.contains("reached end of file")) {
            return "The file ended unexpectedly. You may be missing closing braces }.";
        }
        if (raw.contains("class, interface, or enum expected")) {
            return "Java expects a class, interface, or enum declaration here.";
        }
        if (raw.contains("illegal start of expression")) {
            return "This is not a valid start of a Java expression. Check for misplaced keywords or symbols.";
        }
        if (raw.contains("variable") && raw.contains("might not have been initialized")) {
            return "This variable may not have a value assigned before it's used. Initialize it first.";
        }
        if (raw.contains("unreachable statement")) {
            return "This code can never be reached because an earlier statement always exits (e.g., return, throw).";
        }
        if (raw.contains("duplicate")) {
            return "This name is already declared in the same scope. Use a different name.";
        }
        if (raw.contains("cannot be applied")) {
            return "The method arguments don't match what's expected. Check the types and number of arguments.";
        }

        return raw; // fallback to raw if no match
    }

    /**
     * Suggests a fix for common errors.
     */
    public String suggestFix(String raw) {
        if (raw == null) return null;
        if (raw.contains("';' expected")) return "Add a semicolon at the end of the line.";
        if (raw.contains("'}' expected")) return "Add a closing brace } to close the block.";
        if (raw.contains("cannot find symbol")) return "Declare the variable or import the class.";
        if (raw.contains("incompatible types")) return "Cast the value or change the type to match.";
        return null;
    }

    /** Get cached parse result if source unchanged */
    public Optional<ParsedResult> getCached(String sessionId, String source) {
        CachedParseResult cached = parseCache.get(sessionId);
        if (cached != null && cached.source().equals(source)) {
            return Optional.of(cached.result());
        }
        return Optional.empty();
    }

    private record CachedParseResult(String source, ParsedResult result) {}

    private enum DiagnosticSeverity { ERROR, WARNING, INFO, HINT }
}
