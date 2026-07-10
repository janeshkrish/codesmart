package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * An object on the JVM heap.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class HeapObject {

    private String id;
    private String className;
    private String fullyQualifiedClassName;
    private HeapObjectKind kind;
    private Map<String, Object> fields;
    private Map<String, String> fieldTypes;
    private Map<String, String> fieldRefs; // field name -> heap object id for reference fields
    private long virtualAddress;
    private SourceRange allocationRange; // where 'new' was written
    private boolean gcEligible;
    private int referenceCount;

    // For arrays
    private List<Object> arrayElements;
    private String arrayComponentType;
    private int arrayLength;

    // For strings
    private String stringValue;

    // For collections
    private CollectionKind collectionKind;
    private Object collectionInternalState;

    public enum HeapObjectKind {
        OBJECT, ARRAY, STRING, WRAPPER, COLLECTION, MAP, LAMBDA, ANONYMOUS_CLASS
    }

    public enum CollectionKind {
        ARRAY_LIST, LINKED_LIST, HASH_MAP, HASH_SET, TREE_MAP, TREE_SET,
        LINKED_HASH_MAP, LINKED_HASH_SET, PRIORITY_QUEUE, ARRAY_DEQUE,
        STACK, VECTOR, HASHTABLE, NONE
    }
}
