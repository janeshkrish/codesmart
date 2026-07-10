package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * A JVM stack frame - corresponds to one method invocation.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StackFrame {

    private String id;
    private String methodName;
    private String className;
    private String signature;
    private int depth;
    private List<VariableInfo> localVariables;
    private VariableInfo returnValue;
    private SourceRange range;
    private boolean isActive;
    private long virtualAddress; // simulated memory address
}
