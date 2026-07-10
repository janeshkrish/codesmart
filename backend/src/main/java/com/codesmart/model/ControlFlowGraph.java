package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Control Flow Graph for a single method.
 * Nodes are basic blocks; edges are flow transitions.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ControlFlowGraph {

    private String methodId;
    private String methodName;
    private List<CfgNode> nodes;
    private List<CfgEdge> edges;

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CfgNode {
        private String id;
        private CfgNodeType type;
        private String label;
        private String sourceText;
        private SourceRange range;
        @JsonProperty("isEntry")
        private boolean isEntry;
        @JsonProperty("isExit")
        private boolean isExit;
        private String condition;    // for decision nodes
        private String loopVar;      // for loop nodes
        private String loopId;
        private String parentLoopId;
        private String loopInit;
        private String loopCondition;
        private String loopUpdate;
    }

    @Data
    @Builder
    public static class CfgEdge {
        private String id;
        private String sourceId;
        private String targetId;
        private EdgeLabel label;  // TRUE, FALSE, NORMAL, BACK_EDGE, EXCEPTION
        @JsonProperty("isBackEdge")
        private boolean isBackEdge;
    }

    public enum CfgNodeType {
        START, END,
        STATEMENT,
        DECISION,          // if/while/for condition
        LOOP_INIT,
        LOOP_CONDITION,
        LOOP_UPDATE,
        LOOP_BODY,
        DO_WHILE_BODY,
        SWITCH_HEADER,
        CASE_LABEL,
        TRY_BLOCK,
        CATCH_BLOCK,
        FINALLY_BLOCK,
        THROW,
        RETURN,
        METHOD_CALL
    }

    public enum EdgeLabel {
        TRUE, FALSE, NORMAL, BACK_EDGE, EXCEPTION, DEFAULT
    }
}
