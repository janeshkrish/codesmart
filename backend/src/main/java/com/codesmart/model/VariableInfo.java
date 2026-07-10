package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

/**
 * Represents a variable (field, local var, parameter) with full metadata.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VariableInfo {

    /** Unique variable identifier */
    private String id;

    /** Variable name */
    private String name;

    /** Declared Java type */
    private String type;

    /** Resolved fully-qualified type */
    private String resolvedType;

    /** Storage category */
    private StorageKind storageKind;

    /** Scope id where declared */
    private String scopeId;

    /** Declaration source range */
    private SourceRange declarationRange;

    /** Initializer source range */
    private SourceRange initializerRange;

    /** Static value if determinable without execution */
    private String staticValue;

    /** Whether this is a parameter */
    private boolean parameter;

    /** Whether this is a field */
    private boolean field;

    /** Whether static */
    private boolean staticField;

    /** Whether final */
    private boolean finalVar;

    /** Memory location reference id */
    private String memoryLocationId;

    /** If this is a reference type: the heap object id it points to */
    private String heapObjectId;

    /** Plain English explanation */
    private String explanation;

    public enum StorageKind {
        PRIMITIVE_STACK,   // int, long, double, etc. on stack
        REFERENCE_STACK,   // Object reference on stack, object on heap
        STATIC_AREA,       // Static field
        STRING_POOL,       // String literal
        ARRAY_HEAP,        // Array on heap
        UNKNOWN
    }
}
