package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Represents a method declaration with signature and metadata.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MethodInfo {

    private String id;
    private String name;
    private String returnType;
    private String resolvedReturnType;
    private List<VariableInfo> parameters;
    private List<String> modifiers;
    private String owningClassId;
    private String scopeId;
    private SourceRange range;
    private SourceRange bodyRange;
    private boolean isConstructor;
    private boolean isStatic;
    private boolean isAbstract;
    private boolean isOverride;
    private List<String> thrownExceptions;
    private List<String> calledMethodIds;
    private String explanation;
    private boolean isRecursive;
    private int cyclomaticComplexity;
}
