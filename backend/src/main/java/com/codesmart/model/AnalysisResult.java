package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Complete analysis result returned to frontend after parsing.
 * Represents a full snapshot of the code analysis state.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AnalysisResult {

    /** Unique analysis ID for versioning/diffing */
    private String analysisId;

    /** Timestamp of this analysis */
    private long timestamp;

    /** Source code that was analyzed */
    private String sourceCode;

    /** Whether parsing succeeded */
    private boolean parseSuccess;

    /** Parse/semantic errors */
    private List<DiagnosticInfo> diagnostics;

    /** Complete AST node tree */
    private AstNode astRoot;

    /** All scopes discovered */
    private List<ScopeInfo> scopes;

    /** Complete symbol table */
    private SymbolTable symbolTable;

    /** Memory model snapshot */
    private MemoryModel memoryModel;

    /** Call graph edges */
    private CallGraph callGraph;

    /** Class diagram data */
    private ClassDiagram classDiagram;

    /** Control flow graphs per method */
    private Map<String, ControlFlowGraph> controlFlowGraphs;

    /** Stream pipelines detected */
    private List<StreamPipeline> streamPipelines;

    /** Collection usages detected */
    private List<CollectionUsage> collectionUsages;

    /** Plain English explanations keyed by node id */
    private Map<String, String> explanations;

    /** Thread models detected */
    private List<ThreadModel> threadModels;
}
