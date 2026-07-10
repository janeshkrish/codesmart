package com.codesmart.analyzer;

import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.stmt.*;
import com.github.javaparser.ast.expr.*;
import com.codesmart.model.ControlFlowGraph;
import com.codesmart.model.ControlFlowGraph.*;
import com.codesmart.model.SourceRange;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Builds a Control Flow Graph for a single method.
 * Handles: if/else, for, while, do-while, foreach, switch, try/catch/finally, return, throw.
 */
public class ControlFlowGraphBuilder {

    private final String methodId;
    private final String methodName;
    private final List<CfgNode> nodes = new ArrayList<>();
    private final List<CfgEdge> edges = new ArrayList<>();
    private final AtomicInteger idCounter = new AtomicInteger(0);

    private String entryId;
    private String exitId;

    public ControlFlowGraphBuilder(String methodId, String methodName) {
        this.methodId = methodId;
        this.methodName = methodName;
    }

    private String nextId() {
        return "cfg-" + methodId + "-" + idCounter.incrementAndGet();
    }

    private CfgNode addNode(CfgNodeType type, String label, com.github.javaparser.ast.Node source) {
        CfgNode node = CfgNode.builder()
                .id(nextId())
                .type(type)
                .label(label)
                .sourceText(source != null ? source.toString() : "")
                .range(source != null ? toRange(source) : null)
                .isEntry(false)
                .isExit(false)
                .build();
        nodes.add(node);
        return node;
    }

    private void addEdge(String sourceId, String targetId, EdgeLabel label, boolean isBack) {
        edges.add(CfgEdge.builder()
                .id("e-" + idCounter.incrementAndGet())
                .sourceId(sourceId)
                .targetId(targetId)
                .label(label)
                .isBackEdge(isBack)
                .build());
    }

    public void buildFromBlock(BlockStmt block) {
        CfgNode entry = addNode(CfgNodeType.START, "START", null);
        entry = CfgNode.builder().id(entry.getId()).type(CfgNodeType.START)
                .label("START").isEntry(true).build();
        nodes.set(nodes.size() - 1, entry);
        entryId = entry.getId();

        CfgNode exit = addNode(CfgNodeType.END, "END", null);
        exit = CfgNode.builder().id(exit.getId()).type(CfgNodeType.END)
                .label("END").isExit(true).build();
        nodes.set(nodes.size() - 1, exit);
        exitId = exit.getId();

        String lastId = entryId;
        for (Statement stmt : block.getStatements()) {
            lastId = processStatement(stmt, lastId, exitId);
        }

        if (lastId != null && !lastId.equals(exitId)) {
            addEdge(lastId, exitId, EdgeLabel.NORMAL, false);
        }
    }

    private String processStatement(Statement stmt, String prevId, String exitId) {
        if (stmt instanceof IfStmt ifStmt) {
            return processIf(ifStmt, prevId, exitId);
        } else if (stmt instanceof ForStmt forStmt) {
            return processFor(forStmt, prevId, exitId);
        } else if (stmt instanceof WhileStmt whileStmt) {
            return processWhile(whileStmt, prevId, exitId);
        } else if (stmt instanceof DoStmt doStmt) {
            return processDoWhile(doStmt, prevId, exitId);
        } else if (stmt instanceof ForEachStmt forEachStmt) {
            return processForEach(forEachStmt, prevId, exitId);
        } else if (stmt instanceof SwitchStmt switchStmt) {
            return processSwitch(switchStmt, prevId, exitId);
        } else if (stmt instanceof TryStmt tryStmt) {
            return processTry(tryStmt, prevId, exitId);
        } else if (stmt instanceof ReturnStmt retStmt) {
            CfgNode retNode = addNode(CfgNodeType.RETURN,
                    "return " + retStmt.getExpression().map(Object::toString).orElse(""), retStmt);
            addEdge(prevId, retNode.getId(), EdgeLabel.NORMAL, false);
            addEdge(retNode.getId(), exitId, EdgeLabel.NORMAL, false);
            return null; // no continuation
        } else if (stmt instanceof ThrowStmt throwStmt) {
            CfgNode throwNode = addNode(CfgNodeType.THROW,
                    "throw " + throwStmt.getExpression().toString(), throwStmt);
            addEdge(prevId, throwNode.getId(), EdgeLabel.NORMAL, false);
            return null; // no continuation
        } else if (stmt instanceof BlockStmt blockStmt) {
            String last = prevId;
            for (Statement s : blockStmt.getStatements()) {
                if (last == null) break;
                last = processStatement(s, last, exitId);
            }
            return last;
        } else {
            // Generic statement
            CfgNode stmtNode = addNode(CfgNodeType.STATEMENT,
                    truncate(stmt.toString(), 50), stmt);
            addEdge(prevId, stmtNode.getId(), EdgeLabel.NORMAL, false);
            return stmtNode.getId();
        }
    }

    private String processIf(IfStmt ifStmt, String prevId, String exitId) {
        CfgNode condNode = CfgNode.builder()
                .id(nextId())
                .type(CfgNodeType.DECISION)
                .label("if (" + ifStmt.getCondition().toString() + ")")
                .condition(ifStmt.getCondition().toString())
                .range(toRange(ifStmt))
                .build();
        nodes.add(condNode);
        addEdge(prevId, condNode.getId(), EdgeLabel.NORMAL, false);

        // Join node after if-else
        CfgNode joinNode = addNode(CfgNodeType.STATEMENT, "⟨join⟩", ifStmt);

        // True branch
        String trueEnd = processStatement(ifStmt.getThenStmt(), condNode.getId(), exitId);
        if (trueEnd != null) addEdge(trueEnd, joinNode.getId(), EdgeLabel.NORMAL, false);
        else addEdge(condNode.getId(), joinNode.getId(), EdgeLabel.TRUE, false);

        // False branch (else or direct to join)
        if (ifStmt.getElseStmt().isPresent()) {
            String falseEnd = processStatement(ifStmt.getElseStmt().get(), condNode.getId(), exitId);
            if (falseEnd != null) addEdge(falseEnd, joinNode.getId(), EdgeLabel.NORMAL, false);
        } else {
            addEdge(condNode.getId(), joinNode.getId(), EdgeLabel.FALSE, false);
        }

        // Fix edge labels
        fixEdge(condNode.getId(), ifStmt.getThenStmt(), EdgeLabel.TRUE);

        return joinNode.getId();
    }

    private String processFor(ForStmt forStmt, String prevId, String exitId) {
        // Init node
        CfgNode initNode = CfgNode.builder()
                .id(nextId())
                .type(CfgNodeType.LOOP_INIT)
                .label("init: " + forStmt.getInitialization().toString())
                .loopInit(forStmt.getInitialization().toString())
                .range(toRange(forStmt))
                .build();
        nodes.add(initNode);
        addEdge(prevId, initNode.getId(), EdgeLabel.NORMAL, false);

        // Condition node
        String condLabel = forStmt.getCompare().map(Object::toString).orElse("true");
        CfgNode condNode = CfgNode.builder()
                .id(nextId())
                .type(CfgNodeType.LOOP_CONDITION)
                .label("condition: " + condLabel)
                .condition(condLabel)
                .build();
        nodes.add(condNode);
        addEdge(initNode.getId(), condNode.getId(), EdgeLabel.NORMAL, false);

        // Body
        String bodyEnd = processStatement(forStmt.getBody(), condNode.getId(), exitId);

        // Update node
        CfgNode updateNode = CfgNode.builder()
                .id(nextId())
                .type(CfgNodeType.LOOP_UPDATE)
                .label("update: " + forStmt.getUpdate().toString())
                .loopUpdate(forStmt.getUpdate().toString())
                .build();
        nodes.add(updateNode);
        if (bodyEnd != null) addEdge(bodyEnd, updateNode.getId(), EdgeLabel.NORMAL, false);

        // Back edge from update to condition
        addEdge(updateNode.getId(), condNode.getId(), EdgeLabel.BACK_EDGE, true);

        // Exit node
        CfgNode exitNode = addNode(CfgNodeType.STATEMENT, "⟨after loop⟩", forStmt);
        addEdge(condNode.getId(), exitNode.getId(), EdgeLabel.FALSE, false);

        return exitNode.getId();
    }

    private String processWhile(WhileStmt whileStmt, String prevId, String exitId) {
        CfgNode condNode = CfgNode.builder()
                .id(nextId())
                .type(CfgNodeType.LOOP_CONDITION)
                .label("while (" + whileStmt.getCondition().toString() + ")")
                .condition(whileStmt.getCondition().toString())
                .range(toRange(whileStmt))
                .build();
        nodes.add(condNode);
        addEdge(prevId, condNode.getId(), EdgeLabel.NORMAL, false);

        String bodyEnd = processStatement(whileStmt.getBody(), condNode.getId(), exitId);
        if (bodyEnd != null) addEdge(bodyEnd, condNode.getId(), EdgeLabel.BACK_EDGE, true);

        CfgNode exitNode = addNode(CfgNodeType.STATEMENT, "⟨after while⟩", whileStmt);
        addEdge(condNode.getId(), exitNode.getId(), EdgeLabel.FALSE, false);

        return exitNode.getId();
    }

    private String processDoWhile(DoStmt doStmt, String prevId, String exitId) {
        CfgNode bodyStart = addNode(CfgNodeType.DO_WHILE_BODY, "do {", doStmt);
        addEdge(prevId, bodyStart.getId(), EdgeLabel.NORMAL, false);

        String bodyEnd = processStatement(doStmt.getBody(), bodyStart.getId(), exitId);

        CfgNode condNode = CfgNode.builder()
                .id(nextId())
                .type(CfgNodeType.LOOP_CONDITION)
                .label("while (" + doStmt.getCondition().toString() + ")")
                .condition(doStmt.getCondition().toString())
                .range(toRange(doStmt))
                .build();
        nodes.add(condNode);
        if (bodyEnd != null) addEdge(bodyEnd, condNode.getId(), EdgeLabel.NORMAL, false);

        // Back edge
        addEdge(condNode.getId(), bodyStart.getId(), EdgeLabel.BACK_EDGE, true);

        CfgNode exitNode = addNode(CfgNodeType.STATEMENT, "⟨after do-while⟩", doStmt);
        addEdge(condNode.getId(), exitNode.getId(), EdgeLabel.FALSE, false);

        return exitNode.getId();
    }

    private String processForEach(ForEachStmt forEachStmt, String prevId, String exitId) {
        CfgNode headerNode = CfgNode.builder()
                .id(nextId())
                .type(CfgNodeType.LOOP_CONDITION)
                .label("for (" + forEachStmt.getVariable().toString() +
                       " : " + forEachStmt.getIterable().toString() + ")")
                .condition("hasNext()")
                .range(toRange(forEachStmt))
                .build();
        nodes.add(headerNode);
        addEdge(prevId, headerNode.getId(), EdgeLabel.NORMAL, false);

        String bodyEnd = processStatement(forEachStmt.getBody(), headerNode.getId(), exitId);
        if (bodyEnd != null) addEdge(bodyEnd, headerNode.getId(), EdgeLabel.BACK_EDGE, true);

        CfgNode exitNode = addNode(CfgNodeType.STATEMENT, "⟨after for-each⟩", forEachStmt);
        addEdge(headerNode.getId(), exitNode.getId(), EdgeLabel.FALSE, false);

        return exitNode.getId();
    }

    private String processSwitch(SwitchStmt switchStmt, String prevId, String exitId) {
        CfgNode switchNode = CfgNode.builder()
                .id(nextId())
                .type(CfgNodeType.SWITCH_HEADER)
                .label("switch (" + switchStmt.getSelector().toString() + ")")
                .condition(switchStmt.getSelector().toString())
                .range(toRange(switchStmt))
                .build();
        nodes.add(switchNode);
        addEdge(prevId, switchNode.getId(), EdgeLabel.NORMAL, false);

        CfgNode joinNode = addNode(CfgNodeType.STATEMENT, "⟨after switch⟩", switchStmt);

        for (SwitchEntry entry : switchStmt.getEntries()) {
            String caseLabel = entry.getLabels().isEmpty() ? "default" :
                    "case " + entry.getLabels().toString();
            CfgNode caseNode = addNode(CfgNodeType.CASE_LABEL, caseLabel, switchStmt);
            addEdge(switchNode.getId(), caseNode.getId(),
                    entry.getLabels().isEmpty() ? EdgeLabel.DEFAULT : EdgeLabel.TRUE, false);

            String last = caseNode.getId();
            for (Statement s : entry.getStatements()) {
                if (last == null) break;
                last = processStatement(s, last, exitId);
            }
            if (last != null) addEdge(last, joinNode.getId(), EdgeLabel.NORMAL, false);
        }

        return joinNode.getId();
    }

    private String processTry(TryStmt tryStmt, String prevId, String exitId) {
        CfgNode tryNode = addNode(CfgNodeType.TRY_BLOCK, "try {", tryStmt);
        addEdge(prevId, tryNode.getId(), EdgeLabel.NORMAL, false);

        CfgNode joinNode = addNode(CfgNodeType.STATEMENT, "⟨after try⟩", tryStmt);

        String tryEnd = processStatement(tryStmt.getTryBlock(), tryNode.getId(), exitId);
        if (tryEnd != null) addEdge(tryEnd, joinNode.getId(), EdgeLabel.NORMAL, false);

        for (CatchClause catchClause : tryStmt.getCatchClauses()) {
            CfgNode catchNode = addNode(CfgNodeType.CATCH_BLOCK,
                    "catch (" + catchClause.getParameter().toString() + ")", tryStmt);
            addEdge(tryNode.getId(), catchNode.getId(), EdgeLabel.EXCEPTION, false);
            String catchEnd = processStatement(catchClause.getBody(), catchNode.getId(), exitId);
            if (catchEnd != null) addEdge(catchEnd, joinNode.getId(), EdgeLabel.NORMAL, false);
        }

        tryStmt.getFinallyBlock().ifPresent(fin -> {
            CfgNode finallyNode = addNode(CfgNodeType.FINALLY_BLOCK, "finally {", tryStmt);
            addEdge(joinNode.getId(), finallyNode.getId(), EdgeLabel.NORMAL, false);
            processStatement(fin, finallyNode.getId(), exitId);
        });

        return joinNode.getId();
    }

    private void fixEdge(String fromId, com.github.javaparser.ast.Node targetNode, EdgeLabel label) {
        // Adjust edge labels - for simplicity just add correct labeled edges already done above
    }

    public ControlFlowGraph build() {
        return ControlFlowGraph.builder()
                .methodId(methodId)
                .methodName(methodName)
                .nodes(nodes)
                .edges(edges)
                .build();
    }

    private String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max) + "..." : s;
    }

    private SourceRange toRange(com.github.javaparser.ast.Node node) {
        return node.getRange().map(r -> SourceRange.builder()
                .startLine(r.begin.line).startColumn(r.begin.column)
                .endLine(r.end.line).endColumn(r.end.column).build()
        ).orElse(null);
    }
}
