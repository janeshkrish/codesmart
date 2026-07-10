package com.codesmart.model;

import lombok.Builder;
import lombok.Data;

/** A diagnostic (error, warning, hint) from parsing or semantic analysis. */
@Data @Builder
public class DiagnosticInfo {
    private String id;
    private DiagnosticSeverity severity;
    private String rawMessage;      // compiler-style message
    private String humanMessage;    // plain-English explanation
    private String suggestion;      // how to fix it
    private SourceRange range;
    private String code;            // error code

    public enum DiagnosticSeverity {
        ERROR, WARNING, INFO, HINT
    }
}
