package com.codesmart.execution;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.io.*;
import java.nio.file.*;
import java.util.concurrent.*;

@SpringBootTest
@ActiveProfiles("test")
class ExecutionEngineOutputTest {

    @Test
    void testOutputCapture() throws Exception {
        Path tempDir = Files.createTempDirectory("test-exec-");
        System.out.println("Temp dir: " + tempDir);
        
        String source = "public class Main { public static void main(String[] args) { System.out.println(\"Hello World\"); System.out.println(\"Second line\"); } }";
        Path sourceFile = tempDir.resolve("Main.java");
        Files.writeString(sourceFile, source);
        
        // Compile
        ProcessBuilder compilePb = new ProcessBuilder("javac", "--enable-preview", "--release", "23", "-d", tempDir.toString(), sourceFile.toString());
        compilePb.directory(tempDir.toFile());
        Process compileProcess = compilePb.start();
        int compileResult = compileProcess.waitFor();
        System.out.println("Compile result: " + compileResult);
        
        if (compileResult != 0) {
            try (var reader = new BufferedReader(new InputStreamReader(compileProcess.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("Compile error: " + line);
                }
            }
            return;
        }
        
        // Run
        ProcessBuilder runPb = new ProcessBuilder("java", "--enable-preview", "-cp", tempDir.toString(), "Main");
        runPb.directory(tempDir.toFile());
        runPb.redirectErrorStream(true);
        Process runProcess = runPb.start();
        
        StringBuffer output = new StringBuffer();
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<?> readFuture = executor.submit(() -> {
            try (var reader = new BufferedReader(new InputStreamReader(runProcess.getInputStream()))) {
                String line;
                System.out.println("Reader started");
                while ((line = reader.readLine()) != null) {
                    System.out.println("Read line: " + line);
                    output.append(line).append("\n");
                }
                System.out.println("Reader finished");
            } catch (IOException e) {
                System.out.println("Reader exception: " + e.getMessage());
                e.printStackTrace();
            }
        });
        
        boolean finished = runProcess.waitFor(10, TimeUnit.SECONDS);
        System.out.println("Process finished: " + finished + ", exit code: " + runProcess.exitValue());
        
        // Wait for reader to finish
        readFuture.get(2, TimeUnit.SECONDS);
        executor.shutdown();
        
        System.out.println("Captured output: [" + output.toString() + "]");
        
        assert output.toString().contains("Hello World");
        assert output.toString().contains("Second line");
    }
}