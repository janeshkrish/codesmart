package com.codesmart.parser;

import com.github.javaparser.ast.*;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.*;
import com.github.javaparser.ast.stmt.*;
import com.github.javaparser.ast.type.*;
import com.github.javaparser.ast.visitor.GenericVisitorAdapter;
import com.codesmart.model.AstNode;
import com.codesmart.model.SourceRange;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Visitor that walks JavaParser's AST and builds our domain AstNode tree.
 * Each node gets a unique ID, type label, source range, and explanation.
 */
@Slf4j
public class AstNodeBuilder extends GenericVisitorAdapter<AstNode, Void> {

    private final AtomicInteger nodeCounter = new AtomicInteger(0);
    private final ExplanationGenerator explanationGenerator = new ExplanationGenerator();

    private String nextId() {
        return "ast-" + nodeCounter.incrementAndGet();
    }

    private SourceRange toRange(com.github.javaparser.ast.Node node) {
        return node.getRange().map(r -> SourceRange.builder()
                .startLine(r.begin.line)
                .startColumn(r.begin.column)
                .endLine(r.end.line)
                .endColumn(r.end.column)
                .build()
        ).orElse(null);
    }

    private AstNode buildLeaf(String type, String label, com.github.javaparser.ast.Node node) {
        String id = nextId();
        return AstNode.builder()
                .id(id)
                .type(type)
                .label(label)
                .sourceText(node.toString())
                .range(toRange(node))
                .children(new ArrayList<>())
                .explanation(explanationGenerator.explain(type, label, node.toString()))
                .build();
    }

    @Override
    public AstNode visit(CompilationUnit n, Void arg) {
        AstNode node = buildLeaf("CompilationUnit", "Compilation Unit", n);
        List<AstNode> children = new ArrayList<>();

        n.getPackageDeclaration().ifPresent(pkg -> {
            AstNode pkgNode = buildLeaf("PackageDeclaration", "package " + pkg.getNameAsString(), pkg);
            children.add(pkgNode);
        });

        for (var imp : n.getImports()) {
            AstNode impNode = buildLeaf("ImportDeclaration",
                    (imp.isStatic() ? "import static " : "import ") + imp.getNameAsString(), imp);
            children.add(impNode);
        }

        for (var type : n.getTypes()) {
            AstNode typeNode = type.accept(this, arg);
            if (typeNode != null) children.add(typeNode);
        }

        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(ClassOrInterfaceDeclaration n, Void arg) {
        String kind = n.isInterface() ? "InterfaceDeclaration" : "ClassDeclaration";
        String label = (n.isInterface() ? "interface " : "class ") + n.getNameAsString();
        AstNode node = buildLeaf(kind, label, n);

        List<AstNode> children = new ArrayList<>();

        // Fields
        for (var field : n.getFields()) {
            AstNode fieldNode = field.accept(this, arg);
            if (fieldNode != null) children.add(fieldNode);
        }

        // Methods
        for (var method : n.getMethods()) {
            AstNode methodNode = method.accept(this, arg);
            if (methodNode != null) children.add(methodNode);
        }

        // Constructors
        for (var ctor : n.getConstructors()) {
            AstNode ctorNode = ctor.accept(this, arg);
            if (ctorNode != null) children.add(ctorNode);
        }

        // Inner classes
        for (var inner : n.getMembers()) {
            if (inner instanceof ClassOrInterfaceDeclaration innerClass) {
                AstNode innerNode = innerClass.accept(this, arg);
                if (innerNode != null) children.add(innerNode);
            }
        }

        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(MethodDeclaration n, Void arg) {
        String label = n.getTypeAsString() + " " + n.getNameAsString() + "(" +
                n.getParameters().stream()
                        .map(p -> p.getTypeAsString() + " " + p.getNameAsString())
                        .reduce("", (a, b) -> a.isEmpty() ? b : a + ", " + b) + ")";
        AstNode node = buildLeaf("MethodDeclaration", label, n);

        List<AstNode> children = new ArrayList<>();

        // Parameters
        for (var param : n.getParameters()) {
            AstNode paramNode = buildLeaf("Parameter",
                    param.getTypeAsString() + " " + param.getNameAsString(), param);
            children.add(paramNode);
        }

        // Body
        n.getBody().ifPresent(body -> {
            AstNode bodyNode = body.accept(this, arg);
            if (bodyNode != null) children.add(bodyNode);
        });

        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(ConstructorDeclaration n, Void arg) {
        AstNode node = buildLeaf("ConstructorDeclaration",
                n.getNameAsString() + "(...)", n);
        List<AstNode> children = new ArrayList<>();
        AstNode bodyNode = n.getBody().accept(this, arg);
        if (bodyNode != null) children.add(bodyNode);
        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(FieldDeclaration n, Void arg) {
        String label = n.getElementType().asString() + " " +
                n.getVariables().stream()
                        .map(v -> v.getNameAsString())
                        .reduce("", (a, b) -> a.isEmpty() ? b : a + ", " + b);
        return buildLeaf("FieldDeclaration", "field: " + label, n);
    }

    @Override
    public AstNode visit(BlockStmt n, Void arg) {
        AstNode node = buildLeaf("BlockStmt", "{ Block }", n);
        List<AstNode> children = new ArrayList<>();
        for (var stmt : n.getStatements()) {
            AstNode stmtNode = stmt.accept(this, arg);
            if (stmtNode != null) children.add(stmtNode);
        }
        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(ExpressionStmt n, Void arg) {
        AstNode node = buildLeaf("ExpressionStmt", n.toString(), n);
        AstNode exprNode = n.getExpression().accept(this, arg);
        if (exprNode != null) node.setChildren(List.of(exprNode));
        return node;
    }

    @Override
    public AstNode visit(VariableDeclarationExpr n, Void arg) {
        String type = n.getElementType().asString();
        String vars = n.getVariables().stream()
                .map(v -> v.getNameAsString() +
                        v.getInitializer().map(i -> " = " + i.toString()).orElse(""))
                .reduce("", (a, b) -> a.isEmpty() ? b : a + ", " + b);
        AstNode node = buildLeaf("VariableDeclaration", type + " " + vars, n);

        List<AstNode> children = new ArrayList<>();
        for (var variable : n.getVariables()) {
            AstNode varNode = buildLeaf("VariableDeclarator",
                    variable.getNameAsString(), variable);
            List<AstNode> varChildren = new ArrayList<>();
            variable.getInitializer().ifPresent(init -> {
                AstNode initNode = init.accept(this, arg);
                if (initNode != null) varChildren.add(initNode);
            });
            varNode.setChildren(varChildren);
            children.add(varNode);
        }
        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(AssignExpr n, Void arg) {
        AstNode node = buildLeaf("AssignExpr",
                n.getTarget().toString() + " " + n.getOperator().asString() + " ...", n);
        List<AstNode> children = new ArrayList<>();
        AstNode targetNode = n.getTarget().accept(this, arg);
        if (targetNode != null) children.add(targetNode);
        AstNode valueNode = n.getValue().accept(this, arg);
        if (valueNode != null) children.add(valueNode);
        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(IfStmt n, Void arg) {
        AstNode node = buildLeaf("IfStmt", "if (" + n.getCondition().toString() + ")", n);
        List<AstNode> children = new ArrayList<>();

        AstNode condNode = buildLeaf("Condition", n.getCondition().toString(), n.getCondition());
        children.add(condNode);

        AstNode thenNode = n.getThenStmt().accept(this, arg);
        if (thenNode != null) {
            thenNode.setLabel("then: " + thenNode.getLabel());
            children.add(thenNode);
        }

        n.getElseStmt().ifPresent(elseStmt -> {
            AstNode elseNode = elseStmt.accept(this, arg);
            if (elseNode != null) {
                elseNode.setLabel("else: " + elseNode.getLabel());
                children.add(elseNode);
            }
        });

        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(ForStmt n, Void arg) {
        AstNode node = buildLeaf("ForStmt", "for (...)", n);
        List<AstNode> children = new ArrayList<>();

        AstNode initNode = buildLeaf("ForInit",
                "init: " + n.getInitialization().toString(), n);
        children.add(initNode);

        n.getCompare().ifPresent(cond -> {
            AstNode condNode = buildLeaf("ForCondition", "condition: " + cond.toString(), cond);
            children.add(condNode);
        });

        AstNode updateNode = buildLeaf("ForUpdate",
                "update: " + n.getUpdate().toString(), n);
        children.add(updateNode);

        AstNode bodyNode = n.getBody().accept(this, arg);
        if (bodyNode != null) {
            bodyNode.setLabel("body: " + bodyNode.getLabel());
            children.add(bodyNode);
        }

        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(WhileStmt n, Void arg) {
        AstNode node = buildLeaf("WhileStmt", "while (" + n.getCondition().toString() + ")", n);
        List<AstNode> children = new ArrayList<>();
        AstNode condNode = buildLeaf("Condition", n.getCondition().toString(), n.getCondition());
        children.add(condNode);
        AstNode bodyNode = n.getBody().accept(this, arg);
        if (bodyNode != null) children.add(bodyNode);
        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(DoStmt n, Void arg) {
        AstNode node = buildLeaf("DoWhileStmt", "do...while (" + n.getCondition().toString() + ")", n);
        List<AstNode> children = new ArrayList<>();
        AstNode bodyNode = n.getBody().accept(this, arg);
        if (bodyNode != null) children.add(bodyNode);
        AstNode condNode = buildLeaf("Condition", n.getCondition().toString(), n.getCondition());
        children.add(condNode);
        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(ForEachStmt n, Void arg) {
        AstNode node = buildLeaf("ForEachStmt",
                "for (" + n.getVariable().toString() + " : " + n.getIterable().toString() + ")", n);
        List<AstNode> children = new ArrayList<>();
        AstNode bodyNode = n.getBody().accept(this, arg);
        if (bodyNode != null) children.add(bodyNode);
        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(SwitchStmt n, Void arg) {
        AstNode node = buildLeaf("SwitchStmt", "switch (" + n.getSelector().toString() + ")", n);
        List<AstNode> children = new ArrayList<>();
        for (var entry : n.getEntries()) {
            AstNode caseNode = buildLeaf("SwitchEntry",
                    entry.getLabels().isEmpty() ? "default" : "case " + entry.getLabels().toString(),
                    entry);
            children.add(caseNode);
        }
        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(TryStmt n, Void arg) {
        AstNode node = buildLeaf("TryStmt", "try { ... }", n);
        List<AstNode> children = new ArrayList<>();
        AstNode tryBody = n.getTryBlock().accept(this, arg);
        if (tryBody != null) { tryBody.setLabel("try: " + tryBody.getLabel()); children.add(tryBody); }

        for (var catchClause : n.getCatchClauses()) {
            AstNode catchNode = buildLeaf("CatchClause",
                    "catch (" + catchClause.getParameter().toString() + ")", catchClause);
            AstNode catchBody = catchClause.getBody().accept(this, arg);
            if (catchBody != null) catchNode.setChildren(List.of(catchBody));
            children.add(catchNode);
        }

        n.getFinallyBlock().ifPresent(fin -> {
            AstNode finallyNode = fin.accept(this, arg);
            if (finallyNode != null) { finallyNode.setLabel("finally: " + finallyNode.getLabel()); children.add(finallyNode); }
        });

        node.setChildren(children);
        return node;
    }

    @Override
    public AstNode visit(ReturnStmt n, Void arg) {
        String label = "return " + n.getExpression().map(Object::toString).orElse("void");
        return buildLeaf("ReturnStmt", label, n);
    }

    @Override
    public AstNode visit(ThrowStmt n, Void arg) {
        return buildLeaf("ThrowStmt", "throw " + n.getExpression().toString(), n);
    }

    @Override
    public AstNode visit(MethodCallExpr n, Void arg) {
        String label = n.getScope().map(s -> s.toString() + ".").orElse("") +
                n.getNameAsString() + "(...)";
        return buildLeaf("MethodCallExpr", label, n);
    }

    @Override
    public AstNode visit(ObjectCreationExpr n, Void arg) {
        return buildLeaf("ObjectCreationExpr", "new " + n.getTypeAsString() + "(...)", n);
    }

    @Override
    public AstNode visit(ArrayCreationExpr n, Void arg) {
        return buildLeaf("ArrayCreationExpr", "new " + n.getElementType().asString() + "[...]", n);
    }

    @Override
    public AstNode visit(LambdaExpr n, Void arg) {
        return buildLeaf("LambdaExpr", "(" + n.getParameters() + ") -> ...", n);
    }

    @Override
    public AstNode visit(BinaryExpr n, Void arg) {
        return buildLeaf("BinaryExpr",
                n.getLeft().toString() + " " + n.getOperator().asString() + " " + n.getRight().toString(), n);
    }

    @Override
    public AstNode visit(UnaryExpr n, Void arg) {
        return buildLeaf("UnaryExpr", n.toString(), n);
    }

    @Override
    public AstNode visit(IntegerLiteralExpr n, Void arg) {
        return buildLeaf("IntegerLiteral", n.getValue(), n);
    }

    @Override
    public AstNode visit(StringLiteralExpr n, Void arg) {
        return buildLeaf("StringLiteral", "\"" + n.asString() + "\"", n);
    }

    @Override
    public AstNode visit(BooleanLiteralExpr n, Void arg) {
        return buildLeaf("BooleanLiteral", String.valueOf(n.getValue()), n);
    }

    @Override
    public AstNode visit(NullLiteralExpr n, Void arg) {
        return buildLeaf("NullLiteral", "null", n);
    }

    @Override
    public AstNode visit(NameExpr n, Void arg) {
        return buildLeaf("NameExpr", n.getNameAsString(), n);
    }

    @Override
    public AstNode visit(FieldAccessExpr n, Void arg) {
        return buildLeaf("FieldAccess",
                n.getScope().toString() + "." + n.getNameAsString(), n);
    }
}
