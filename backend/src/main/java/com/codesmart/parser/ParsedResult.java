package com.codesmart.parser;

import com.github.javaparser.ast.CompilationUnit;
import com.codesmart.model.DiagnosticInfo;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Result of a single parse operation.
 */
@Data
@Builder
public class ParsedResult {
    private String analysisId;
    private String sessionId;
    private CompilationUnit compilationUnit;
    private List<DiagnosticInfo> diagnostics;
    private boolean parseSuccess;
    private String sourceCode;
    private long parseTimeMs;
}
