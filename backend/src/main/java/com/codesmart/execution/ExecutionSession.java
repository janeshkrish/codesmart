package com.codesmart.execution;

import lombok.Data;
import java.nio.file.Path;
import java.util.List;

/** Mutable execution session state. */
@Data
public class ExecutionSession {
    private String executionId;
    private String source;
    private String className;
    private Status status;
    private Process process;
    private Path workDir;
    private StringBuffer consoleOutput;
    private List<StepResult> stepHistory;
    private int currentStepIndex;
    private volatile boolean running;

    public enum Status {
        READY, COMPILED, RUNNING, PAUSED, FINISHED, ERROR
    }
}
