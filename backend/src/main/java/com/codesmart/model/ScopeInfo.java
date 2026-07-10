package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Represents a lexical scope (block scope, method scope, class scope).
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ScopeInfo {

    /** Unique scope identifier */
    private String id;

    /** Human-readable name (method name, "block", "class name") */
    private String name;

    /** Type of scope */
    private ScopeType type;

    /** Parent scope id */
    private String parentScopeId;

    /** Child scope ids */
    private List<String> childScopeIds;

    /** Source range of this scope block */
    private SourceRange range;

    /** Variables declared directly in this scope */
    private List<VariableInfo> variables;

    /** Methods declared in this scope (for class scopes) */
    private List<String> methodIds;

    /** Depth level (0 = top-level) */
    private int depth;

    /** Color for visualization (assigned by depth) */
    private String color;

    public enum ScopeType {
        COMPILATION_UNIT,
        CLASS,
        INTERFACE,
        METHOD,
        CONSTRUCTOR,
        BLOCK,
        FOR_STMT,
        WHILE_STMT,
        DO_STMT,
        TRY_STMT,
        CATCH_CLAUSE,
        LAMBDA,
        SWITCH
    }
}
