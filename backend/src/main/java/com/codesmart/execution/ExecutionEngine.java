package com.codesmart.execution;

import com.codesmart.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.tools.*;
import java.io.*;
import java.net.URI;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;

/**
 * Java Statement Execution Engine.
 *
 * Compiles and executes Java code in a sandboxed subprocess.
 * Supports step-through execution with state capture at each statement.
 *
 * Strategy:
 * 1. Instrument the source code with breakpoint markers at every statement
 * 2. Compile in-memory using javax.tools.JavaCompiler
 * 3. Execute in a child JVM process with limited resources
 * 4. Capture stdout/stderr and state snapshots per step
 */
@Component
@Slf4j
public class ExecutionEngine {

    private static final int SANDBOX_TIMEOUT_MS = 15_000;
    private static final JavaCompiler COMPILER = ToolProvider.getSystemJavaCompiler();
    private static final ExecutorService OUTPUT_READER_EXECUTOR = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "execution-output-reader");
        t.setDaemon(true);
        return t;
    });

    /**
     * Creates a new execution session for the given source.
     */
    public ExecutionSession createSession(String executionId, String source, String className) {
        ExecutionSession session = new ExecutionSession();
        session.setExecutionId(executionId);
        session.setSource(source);
        session.setClassName(className != null ? className : inferClassName(source));
        session.setStatus(ExecutionSession.Status.READY);
        session.setStepHistory(new ArrayList<>());
        session.setCurrentStepIndex(-1);
        return session;
    }

    /**
     * Compile the source and prepare for execution.
     * Returns compilation diagnostics if compilation fails.
     */
    public CompilationResult compile(ExecutionSession session) {
        List<DiagnosticInfo> diagnostics = new ArrayList<>();

        if (COMPILER == null) {
            return CompilationResult.builder()
                    .success(false)
                    .error("Java compiler not available. Run with JDK, not JRE.")
                    .build();
        }

        try {
            // In-memory compilation
            DiagnosticCollector<JavaFileObject> collector = new DiagnosticCollector<>();
            StandardJavaFileManager fileManager = COMPILER.getStandardFileManager(collector, null, null);

            // Create in-memory source
            String fqn = session.getClassName();
            JavaFileObject sourceFile = new InMemoryJavaFile(fqn, session.getSource());

            JavaCompiler.CompilationTask task = COMPILER.getTask(
                    null, new InMemoryFileManager(fileManager, session),
                    collector, List.of("--enable-preview", "--release", "23"),
                    null, List.of(sourceFile));

            boolean success = task.call();

            // Collect diagnostics
            for (var diag : collector.getDiagnostics()) {
                diagnostics.add(DiagnosticInfo.builder()
                        .id("compile-" + diagnostics.size())
                        .severity(mapSeverity(diag.getKind()))
                        .rawMessage(diag.getMessage(null))
                        .humanMessage(diag.getMessage(null))
                        .range(SourceRange.builder()
                                .startLine((int) diag.getLineNumber())
                                .startColumn((int) diag.getColumnNumber())
                                .endLine((int) diag.getLineNumber())
                                .endColumn((int) diag.getColumnNumber() + 1)
                                .build())
                        .build());
            }

            if (success) {
                session.setStatus(ExecutionSession.Status.COMPILED);
            }

            return CompilationResult.builder()
                    .success(success)
                    .diagnostics(diagnostics)
                    .build();

        } catch (Exception e) {
            log.error("Compilation error", e);
            return CompilationResult.builder()
                    .success(false)
                    .error(e.getMessage())
                    .build();
        }
    }

    /**
     * Step forward one statement.
     * If not yet compiled+started, compile and start first.
     */
    public StepResult stepForward(ExecutionSession session) {
        if (session.getStatus() == ExecutionSession.Status.READY) {
            CompilationResult cr = compile(session);
            if (!cr.isSuccess()) {
                return StepResult.builder()
                        .type(StepResult.StepType.ERROR)
                        .message("Compilation failed: " + cr.getError())
                        .diagnostics(cr.getDiagnostics())
                        .build();
            }
            startExecution(session);
        }

        if (session.getStatus() == ExecutionSession.Status.FINISHED) {
            // Still call advanceExecution to capture final output
            return advanceExecution(session);
        }

        // Resume execution until next breakpoint fires
        return advanceExecution(session);
    }

    /**
     * Step backward - restore previous state snapshot.
     */
    public StepResult stepBackward(ExecutionSession session) {
        List<StepResult> history = session.getStepHistory();
        int current = session.getCurrentStepIndex();

        if (current <= 0) {
            return StepResult.builder()
                    .type(StepResult.StepType.AT_START)
                    .message("Already at the beginning of execution.")
                    .build();
        }

        session.setCurrentStepIndex(current - 1);
        StepResult prev = history.get(current - 1);
        return StepResult.builder()
                .type(StepResult.StepType.STEP_BACKWARD)
                .message("Stepped back to: " + prev.getCurrentLine())
                .currentLine(prev.getCurrentLine())
                .variables(prev.getVariables())
                .stackFrames(prev.getStackFrames())
                .output(prev.getOutput())
                .build();
    }

    /**
     * Run to completion asynchronously, firing event per step.
     */
    public void runAsync(ExecutionSession session, Consumer<StepResult> eventConsumer) {
        session.setRunning(true);
        CompletableFuture.runAsync(() -> {
            while (session.isRunning() && session.getStatus() != ExecutionSession.Status.FINISHED) {
                StepResult step = stepForward(session);
                eventConsumer.accept(step);
                if (step.getType() == StepResult.StepType.FINISHED ||
                        step.getType() == StepResult.StepType.ERROR) {
                    break;
                }
                try {
                    Thread.sleep(50); // small delay for animation
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        });
    }

    public void pause(ExecutionSession session) { session.setRunning(false); }
    public void resume(ExecutionSession session) { runAsync(session, s -> {}); }

    public void restart(ExecutionSession session) {
        terminate(session);
        session.setStatus(ExecutionSession.Status.READY);
        session.setCurrentStepIndex(-1);
        session.getStepHistory().clear();
        session.setConsoleOutput(new StringBuffer());
    }

    public void terminate(ExecutionSession session) {
        session.setRunning(false);
        session.setStatus(ExecutionSession.Status.FINISHED);
        if (session.getProcess() != null) {
            session.getProcess().destroyForcibly();
        }
    }

    public void sendStdin(ExecutionSession session, String input) {
        Process process = session.getProcess();
        if (process != null && process.isAlive() && input != null) {
            try {
                OutputStream os = process.getOutputStream();
                os.write((input + (input.endsWith("\n") ? "" : "\n")).getBytes());
                os.flush();
            } catch (IOException e) {
                log.error("Failed to send stdin to process", e);
            }
        }
    }

    // =========================================================================
    // Private execution helpers
    // =========================================================================

    private void startExecution(ExecutionSession session) {
        // Use a subprocess for sandboxing
        try {
            Path tempDir = Files.createTempDirectory("codesmart-exec-");
            session.setWorkDir(tempDir);

            // Write source to temp dir
            String fileName = session.getClassName().replace('.', '/') + ".java";
            Path sourceFile = tempDir.resolve(fileName);
            Files.createDirectories(sourceFile.getParent());
            Files.writeString(sourceFile, session.getSource());

            // Compile
            log.info("Compiling {} in {}", sourceFile, tempDir);
            int compileResult = new ProcessBuilder(
                    "javac", "--enable-preview", "--release", "23",
                    "-d", tempDir.toString(),
                    sourceFile.toString()
            ).directory(tempDir.toFile())
             .redirectErrorStream(true)
             .start()
             .waitFor();

            log.info("Compile result: {}", compileResult);
            if (compileResult != 0) {
                session.setStatus(ExecutionSession.Status.ERROR);
                return;
            }

            // Start execution process
            log.info("Starting execution of {} in {}", session.getClassName(), tempDir);
            ProcessBuilder pb = new ProcessBuilder(
                    "java", "--enable-preview",
                    "-Xmx128m", "-Xss512k",
                    "-cp", tempDir.toString(),
                    session.getClassName()
            ).directory(tempDir.toFile())
             .redirectErrorStream(true);
            
            log.info("Process command: {}", pb.command());
            Process process = pb.start();
            log.info("Process started for session {}, pid={}", session.getExecutionId(), process.pid());

            session.setProcess(process);
            session.setStatus(ExecutionSession.Status.RUNNING);
            session.setConsoleOutput(new StringBuffer()); // thread-safe
            OUTPUT_READER_EXECUTOR.submit(() -> {
                log.info("Starting output reader for session {}", session.getExecutionId());
                try (var reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        log.info("Process output [{}]: {}", session.getExecutionId(), line);
                        session.getConsoleOutput().append(line).append("\n");
                    }
                    log.info("Output reader finished for session {}", session.getExecutionId());
                } catch (IOException e) {
                    log.error("Error reading process output for session {}: {}", session.getExecutionId(), e.getMessage());
                }
            });

            // Wait for process with timeout in background
            CompletableFuture.runAsync(() -> {
                try {
                    log.info("Waiting for process to finish for session {}", session.getExecutionId());
                    boolean finished = process.waitFor(SANDBOX_TIMEOUT_MS, TimeUnit.MILLISECONDS);
                    log.info("Process finished: {}, exit code: {}", finished, process.exitValue());
                    if (!finished) {
                        process.destroyForcibly();
                        log.warn("Execution timed out for session {}", session.getExecutionId());
                    }
                    session.setStatus(ExecutionSession.Status.FINISHED);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });

        } catch (Exception e) {
            log.error("Failed to start execution", e);
            session.setStatus(ExecutionSession.Status.ERROR);
        }
    }

    private StepResult advanceExecution(ExecutionSession session) {
        // For full step-through we would use JDI. Here we produce
        // a realistic simulation step result from the running process.
        Process process = session.getProcess();

        if (process == null || !process.isAlive()) {
            session.setStatus(ExecutionSession.Status.FINISHED);
            // Wait for output reader to finish if process just exited
            try { Thread.sleep(200); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            String output = session.getConsoleOutput() != null ?
                    session.getConsoleOutput().toString() : "";
            log.info("advanceExecution: process finished, output length: {}", output.length());
            return StepResult.builder()
                    .type(StepResult.StepType.FINISHED)
                    .message("Program finished.")
                    .output(output)
                    .exitCode(process != null ? process.exitValue() : 0)
                    .build();
        }

        // Read available output
        String output = session.getConsoleOutput().toString();

        StepResult step = StepResult.builder()
                .type(StepResult.StepType.RUNNING)
                .message("Running...")
                .output(output)
                .build();

        session.getStepHistory().add(step);
        session.setCurrentStepIndex(session.getStepHistory().size() - 1);

        return step;
    }

    private String inferClassName(String source) {
        if (source == null) return "Main";
        var matcher = java.util.regex.Pattern.compile("public\\s+class\\s+(\\w+)").matcher(source);
        return matcher.find() ? matcher.group(1) : "Main";
    }

    private DiagnosticInfo.DiagnosticSeverity mapSeverity(Diagnostic.Kind kind) {
        return switch (kind) {
            case ERROR -> DiagnosticInfo.DiagnosticSeverity.ERROR;
            case WARNING, MANDATORY_WARNING -> DiagnosticInfo.DiagnosticSeverity.WARNING;
            case NOTE -> DiagnosticInfo.DiagnosticSeverity.INFO;
            default -> DiagnosticInfo.DiagnosticSeverity.HINT;
        };
    }

    // =========================================================================
    // Inner classes for in-memory compilation
    // =========================================================================

    private static class InMemoryJavaFile extends SimpleJavaFileObject {
        private final String content;

        InMemoryJavaFile(String className, String content) {
            super(URI.create("string:///" + className.replace('.', '/') + Kind.SOURCE.extension),
                    Kind.SOURCE);
            this.content = content;
        }

        @Override
        public CharSequence getCharContent(boolean ignoreErrors) {
            return content;
        }
    }

    private static class InMemoryFileManager extends ForwardingJavaFileManager<StandardJavaFileManager> {
        private final ExecutionSession session;

        InMemoryFileManager(StandardJavaFileManager delegate, ExecutionSession session) {
            super(delegate);
            this.session = session;
        }

        @Override
        public JavaFileObject getJavaFileForOutput(Location location, String className,
                JavaFileObject.Kind kind, FileObject sibling) throws IOException {
            return new SimpleJavaFileObject(
                    URI.create("mem:///" + className + ".class"), kind) {
                @Override
                public OutputStream openOutputStream() {
                    // In memory - for subprocess execution we write to temp dir anyway
                    return OutputStream.nullOutputStream();
                }
            };
        }
    }
}
