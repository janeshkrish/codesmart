package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Represents a node in the Abstract Syntax Tree.
 * Carries full position, type, and semantic information.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AstNode {

    /** Unique node identifier */
    private String id;

    /** Node type (e.g., MethodDeclaration, VariableDeclarator, ForStmt) */
    private String type;

    /** Human-readable label for display */
    private String label;

    /** Raw source text of this node */
    private String sourceText;

    /** Source position */
    private SourceRange range;

    /** Resolved Java type (e.g., "int", "java.lang.String") */
    private String resolvedType;

    /** Scope ID this node belongs to */
    private String scopeId;

    /** Child nodes */
    private List<AstNode> children;

    /** Additional properties (e.g., modifiers, operator) */
    private Map<String, Object> properties;

    /** Whether this node has semantic errors */
    private boolean hasError;

    /** Error message if hasError */
    private String errorMessage;

    /** Memory reference id if this node allocates memory */
    private String memoryRefId;

    /** Plain English explanation */
    private String explanation;
}
