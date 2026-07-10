package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Method call graph - all method calls and their relationships.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CallGraph {

    private List<CallGraphNode> nodes;
    private List<CallGraphEdge> edges;

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CallGraphNode {
        private String id;
        private String methodName;
        private String className;
        private String signature;
        private SourceRange range;
        private boolean isEntry;
        private boolean isRecursive;
        private boolean isExternal; // java.util.*, etc.
    }

    @Data
    @Builder
    public static class CallGraphEdge {
        private String id;
        private String callerId;
        private String calleeId;
        private SourceRange callSiteRange;
        private boolean isRecursiveCall;
        private List<String> argumentTypes;
    }
}
