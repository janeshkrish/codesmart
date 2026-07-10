package com.codesmart.model;

import lombok.Builder;
import lombok.Data;

/** A memory reference arrow: from a variable/field to a heap object. */
@Data @Builder
public class MemoryReference {
    private String id;
    private String fromId;   // variable id or heap object field ref
    private String toId;     // heap object id
    private String label;    // field name or variable name
    private ReferenceType type;

    public enum ReferenceType {
        STACK_TO_HEAP,    // local var → heap object
        FIELD_TO_HEAP,    // field of object → another heap object
        ARRAY_ELEMENT,    // array[i] → heap object
        STATIC_TO_HEAP    // static field → heap object
    }
}
