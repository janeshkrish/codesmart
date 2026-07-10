package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Complete JVM memory model snapshot.
 * Represents all memory areas and their contents.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MemoryModel {

    /** Stack frames (one per method call in execution, or one 'main' for static analysis) */
    private List<StackFrame> stackFrames;

    /** Heap objects */
    private List<HeapObject> heapObjects;

    /** String pool entries */
    private List<StringPoolEntry> stringPool;

    /** Static area entries */
    private List<StaticAreaEntry> staticArea;

    /** Method area (class metadata) */
    private List<MethodAreaEntry> methodArea;

    /** All reference arrows (from variable to heap object) */
    private List<MemoryReference> references;

    /** Objects eligible for GC (no references pointing to them) */
    private List<String> gcEligibleIds;
}
