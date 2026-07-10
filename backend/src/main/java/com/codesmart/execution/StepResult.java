package com.codesmart.execution;

import com.codesmart.model.*;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/** Result of a single execution step. */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StepResult {
    private StepType type;
    private String message;
    private int currentLine;
    private String currentStatement;
    private Map<String, Object> variables;
    private List<StackFrame> stackFrames;
    private MemoryModel memorySnapshot;
    private String output;
    private int exitCode;
    private List<DiagnosticInfo> diagnostics;

    public enum StepType {
        STEP_FORWARD,
        STEP_BACKWARD,
        RUNNING,
        PAUSED,
        FINISHED,
        AT_START,
        ERROR
    }
}
