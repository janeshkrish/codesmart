package com.codesmart.analyzer;

import com.codesmart.model.ControlFlowGraph;
import com.codesmart.model.ControlFlowGraph.CfgEdge;
import com.codesmart.model.ControlFlowGraph.CfgNode;
import com.codesmart.model.ControlFlowGraph.CfgNodeType;
import com.codesmart.model.ControlFlowGraph.EdgeLabel;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.body.MethodDeclaration;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class ControlFlowGraphBuilderTest {

    @Test
    void forLoopConditionHasTrueBodyEdgeAndFalseExitEdge() {
        ControlFlowGraph cfg = build("""
                class Example {
                    void sumTo(int n) {
                        int sum = 0;
                        for (int i = 0; i < n; i++) {
                            sum += i;
                        }
                    }
                }
                """);

        CfgNode condition = findNode(cfg, CfgNodeType.LOOP_CONDITION, "i < n");
        List<CfgEdge> outgoing = cfg.getEdges().stream()
                .filter(edge -> edge.getSourceId().equals(condition.getId()))
                .toList();

        assertThat(outgoing)
                .anySatisfy(edge -> {
                    assertThat(edge.getLabel()).isEqualTo(EdgeLabel.TRUE);
                    assertThat(findNode(cfg, edge.getTargetId()).getLabel()).contains("sum += i");
                })
                .anySatisfy(edge -> {
                    assertThat(edge.getLabel()).isEqualTo(EdgeLabel.FALSE);
                    assertThat(findNode(cfg, edge.getTargetId()).getLabel()).contains("after loop");
                });
    }

    @Test
    void forLoopInitConditionBodyAndUpdateShareLoopId() {
        ControlFlowGraph cfg = build("""
                class Example {
                    void sumTo(int n) {
                        int sum = 0;
                        for (int i = 0; i < n; i++) {
                            sum += i;
                        }
                    }
                }
                """);

        List<CfgNode> loopNodes = cfg.getNodes().stream()
                .filter(node -> node.getType() == CfgNodeType.LOOP_INIT
                        || node.getType() == CfgNodeType.LOOP_CONDITION
                        || node.getType() == CfgNodeType.LOOP_UPDATE
                        || node.getLabel().contains("sum += i"))
                .toList();

        Set<String> loopIds = loopNodes.stream()
                .map(CfgNode::getLoopId)
                .collect(Collectors.toSet());

        assertThat(loopNodes).hasSize(4);
        assertThat(loopIds).hasSize(1);
        assertThat(loopIds.iterator().next()).isNotBlank();
    }

    private ControlFlowGraph build(String source) {
        MethodDeclaration method = StaticJavaParser.parse(source)
                .findFirst(MethodDeclaration.class)
                .orElseThrow();
        ControlFlowGraphBuilder builder = new ControlFlowGraphBuilder("test-method", method.getNameAsString());
        builder.buildFromBlock(method.getBody().orElseThrow());
        return builder.build();
    }

    private CfgNode findNode(ControlFlowGraph cfg, CfgNodeType type, String labelFragment) {
        return cfg.getNodes().stream()
                .filter(node -> node.getType() == type)
                .filter(node -> node.getLabel().contains(labelFragment)
                        || (node.getCondition() != null && node.getCondition().contains(labelFragment)))
                .findFirst()
                .orElseThrow();
    }

    private CfgNode findNode(ControlFlowGraph cfg, String nodeId) {
        return cfg.getNodes().stream()
                .filter(node -> node.getId().equals(nodeId))
                .findFirst()
                .orElseThrow();
    }
}
