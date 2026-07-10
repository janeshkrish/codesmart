package com.codesmart.execution;

import com.codesmart.model.DiagnosticInfo;
import lombok.Builder;
import lombok.Data;
import java.util.List;

/** Result of compilation attempt. */
@Data
@Builder
public class CompilationResult {
    private boolean success;
    private String error;
    private List<DiagnosticInfo> diagnostics;
}
