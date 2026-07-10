package com.codesmart.analyzer;

import com.github.javaparser.ast.*;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.*;
import com.github.javaparser.ast.stmt.*;
import com.github.javaparser.ast.type.Type;
import com.github.javaparser.ast.visitor.VoidVisitorAdapter;
import com.github.javaparser.resolution.types.ResolvedType;
import com.codesmart.model.*;
import com.codesmart.parser.ParsedResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Semantic Analyzer - walks the parsed AST and builds:
 * - Complete symbol table (variables, methods, classes, imports)
 * - Scope tree
 * - Type resolution
 * - Reference tracking
 * - Collection detection
 * - Stream pipeline detection
 * - Thread model detection
 * - Call graph
 * - Class diagram data
 */
@Component
@Slf4j
public class SemanticAnalyzer {

    private final AtomicInteger idCounter = new AtomicInteger(0);
    private final String[] SCOPE_COLORS = {
            "#7c3aed20", "#0ea5e920", "#10b98120", "#f59e0b20",
            "#ef444420", "#8b5cf620", "#06b6d420", "#84cc1620"
    };

    private String nextId(String prefix) {
        return prefix + "-" + idCounter.incrementAndGet();
    }

    /**
     * Main analysis entry point. Returns a fully populated AnalysisResult.
     */
    public AnalysisResult analyze(ParsedResult parsed) {
        if (parsed.getCompilationUnit() == null) {
            return buildEmptyResult(parsed);
        }

        AnalysisContext ctx = new AnalysisContext();
        CompilationUnit cu = parsed.getCompilationUnit();

        // Walk AST and collect everything
        cu.accept(new AnalysisVisitor(ctx), null);

        // Resolve call graph recursion
        detectRecursion(ctx);

        // Detect GC-eligible objects
        detectGcEligible(ctx);

        return AnalysisResult.builder()
                .analysisId(parsed.getAnalysisId())
                .timestamp(System.currentTimeMillis())
                .sourceCode(parsed.getSourceCode())
                .parseSuccess(parsed.isParseSuccess())
                .diagnostics(parsed.getDiagnostics())
                .scopes(new ArrayList<>(ctx.scopes.values()))
                .symbolTable(buildSymbolTable(ctx))
                .memoryModel(buildMemoryModel(ctx))
                .callGraph(buildCallGraph(ctx))
                .classDiagram(buildClassDiagram(ctx))
                .controlFlowGraphs(ctx.cfgs)
                .streamPipelines(ctx.streamPipelines)
                .collectionUsages(ctx.collectionUsages)
                .threadModels(ctx.threadModels)
                .build();
    }

    // =========================================================================
    // Inner Analysis Context - mutable state during visit
    // =========================================================================

    private class AnalysisContext {
        // Scope tracking
        final Map<String, ScopeInfo> scopes = new LinkedHashMap<>();
        final Deque<String> scopeStack = new ArrayDeque<>();
        int scopeDepth = 0;

        // Symbol tracking
        final Map<String, VariableInfo> variables = new LinkedHashMap<>();
        final Map<String, MethodInfo> methods = new LinkedHashMap<>();
        final Map<String, ClassInfo> classes = new LinkedHashMap<>();
        final List<ImportInfo> imports = new ArrayList<>();
        String packageName = null;

        // Memory tracking
        final List<StackFrame> stackFrames = new ArrayList<>();
        final List<HeapObject> heapObjects = new ArrayList<>();
        final List<StringPoolEntry> stringPool = new ArrayList<>();
        final List<StaticAreaEntry> staticArea = new ArrayList<>();
        final List<MethodAreaEntry> methodArea = new ArrayList<>();
        final List<MemoryReference> references = new ArrayList<>();

        // Call graph
        final List<CallGraph.CallGraphNode> callNodes = new ArrayList<>();
        final List<CallGraph.CallGraphEdge> callEdges = new ArrayList<>();
        final Deque<String> methodCallStack = new ArrayDeque<>();

        // Class diagram
        final List<ClassDiagram.ClassDiagramNode> classNodes = new ArrayList<>();
        final List<ClassDiagram.ClassDiagramEdge> classEdges = new ArrayList<>();

        // CFGs per method
        final Map<String, ControlFlowGraph> cfgs = new LinkedHashMap<>();

        // Stream pipelines
        final List<StreamPipeline> streamPipelines = new ArrayList<>();

        // Collection usages
        final List<CollectionUsage> collectionUsages = new ArrayList<>();

        // Thread models
        final List<ThreadModel> threadModels = new ArrayList<>();

        // Address simulation
        long heapAddress = 0x1000_0000L;
        long stackAddress = 0x7fff_0000L;
        long staticAddress = 0x0040_0000L;

        long nextHeapAddress() { return heapAddress += 0x100; }
        long nextStackAddress() { return stackAddress -= 0x10; }
        long nextStaticAddress() { return staticAddress += 0x10; }

        String currentScope() {
            return scopeStack.isEmpty() ? null : scopeStack.peek();
        }

        String currentMethod() {
            return methodCallStack.isEmpty() ? null : methodCallStack.peek();
        }
    }

    // =========================================================================
    // Visitor Implementation
    // =========================================================================

    private class AnalysisVisitor extends VoidVisitorAdapter<Void> {
        private final AnalysisContext ctx;

        AnalysisVisitor(AnalysisContext ctx) { this.ctx = ctx; }

        @Override
        public void visit(CompilationUnit n, Void arg) {
            // Package
            n.getPackageDeclaration().ifPresent(pkg -> {
                ctx.packageName = pkg.getNameAsString();
            });

            // Imports
            n.getImports().forEach(imp -> {
                ctx.imports.add(ImportInfo.builder()
                        .id(nextId("imp"))
                        .importDeclaration(imp.getNameAsString())
                        .isStatic(imp.isStatic())
                        .isAsterisk(imp.isAsterisk())
                        .range(toRange(imp))
                        .build());
            });

            // Push compilation unit scope
            String scopeId = pushScope("Compilation Unit", ScopeInfo.ScopeType.COMPILATION_UNIT, n);
            super.visit(n, arg);
            popScope();
        }

        @Override
        public void visit(ClassOrInterfaceDeclaration n, Void arg) {
            String classId = nextId("cls");
            String scopeId = pushScope(n.getNameAsString(),
                    n.isInterface() ? ScopeInfo.ScopeType.INTERFACE : ScopeInfo.ScopeType.CLASS, n);

            // Build class info
            ClassInfo.ClassKind kind = n.isInterface() ? ClassInfo.ClassKind.INTERFACE :
                    (n.isAbstract() ? ClassInfo.ClassKind.ABSTRACT_CLASS : ClassInfo.ClassKind.CLASS);

            List<String> modifiers = n.getModifiers().stream()
                    .map(m -> m.getKeyword().asString()).toList();

            ClassInfo classInfo = ClassInfo.builder()
                    .id(classId)
                    .name(n.getNameAsString())
                    .fullyQualifiedName(ctx.packageName != null ?
                            ctx.packageName + "." + n.getNameAsString() : n.getNameAsString())
                    .kind(kind)
                    .modifiers(modifiers)
                    .scopeId(scopeId)
                    .range(toRange(n))
                    .fields(new ArrayList<>())
                    .methodIds(new ArrayList<>())
                    .innerClassIds(new ArrayList<>())
                    .interfaceNames(new ArrayList<>())
                    .build();

            // Superclass
            n.getExtendedTypes().forEach(ext -> {
                classInfo.setSuperclassName(ext.getNameAsString());
            });

            // Interfaces
            n.getImplementedTypes().forEach(impl -> {
                classInfo.getInterfaceNames().add(impl.getNameAsString());
            });

            // Type parameters
            if (!n.getTypeParameters().isEmpty()) {
                classInfo.setGeneric(true);
                classInfo.setTypeParameters(n.getTypeParameters().stream()
                        .map(tp -> tp.getNameAsString()).toList());
            }

            ctx.classes.put(classId, classInfo);

            // Method area entry
            ctx.methodArea.add(MethodAreaEntry.builder()
                    .id(nextId("ma"))
                    .className(n.getNameAsString())
                    .fullyQualifiedName(classInfo.getFullyQualifiedName())
                    .methodSignatures(new ArrayList<>())
                    .fieldSignatures(new ArrayList<>())
                    .virtualAddress(ctx.nextStaticAddress())
                    .build());

            // Build class diagram node
            ClassDiagram.ClassDiagramNode diagramNode = ClassDiagram.ClassDiagramNode.builder()
                    .id(classId)
                    .name(n.getNameAsString())
                    .fullyQualifiedName(classInfo.getFullyQualifiedName())
                    .kind(kind)
                    .fields(new ArrayList<>())
                    .methods(new ArrayList<>())
                    .build();
            ctx.classNodes.add(diagramNode);

            // Class diagram edges - inheritance
            n.getExtendedTypes().forEach(ext -> {
                ctx.classEdges.add(ClassDiagram.ClassDiagramEdge.builder()
                        .id(nextId("edge"))
                        .sourceId(classId)
                        .targetId(ext.getNameAsString()) // will be resolved later
                        .type(ClassDiagram.RelationshipType.INHERITANCE)
                        .build());
            });

            // Class diagram edges - implementation
            n.getImplementedTypes().forEach(impl -> {
                ctx.classEdges.add(ClassDiagram.ClassDiagramEdge.builder()
                        .id(nextId("edge"))
                        .sourceId(classId)
                        .targetId(impl.getNameAsString())
                        .type(ClassDiagram.RelationshipType.IMPLEMENTATION)
                        .build());
            });

            super.visit(n, arg);
            popScope();
        }

        @Override
        public void visit(MethodDeclaration n, Void arg) {
            String methodId = nextId("mth");
            String scopeId = pushScope(n.getNameAsString(), ScopeInfo.ScopeType.METHOD, n);
            ctx.methodCallStack.push(methodId);

            List<VariableInfo> params = new ArrayList<>();
            n.getParameters().forEach(p -> {
                VariableInfo paramInfo = buildVariableInfo(
                        p.getNameAsString(), p.getTypeAsString(), true, false, scopeId, toRange(p));
                params.add(paramInfo);
                ctx.variables.put(paramInfo.getId(), paramInfo);
            });

            MethodInfo methodInfo = MethodInfo.builder()
                    .id(methodId)
                    .name(n.getNameAsString())
                    .returnType(n.getTypeAsString())
                    .parameters(params)
                    .modifiers(n.getModifiers().stream().map(m -> m.getKeyword().asString()).toList())
                    .scopeId(scopeId)
                    .range(toRange(n))
                    .isStatic(n.isStatic())
                    .isAbstract(n.isAbstract())
                    .calledMethodIds(new ArrayList<>())
                    .build();

            ctx.methods.put(methodId, methodInfo);

            // Call graph node
            ctx.callNodes.add(CallGraph.CallGraphNode.builder()
                    .id(methodId)
                    .methodName(n.getNameAsString())
                    .signature(n.getDeclarationAsString())
                    .range(toRange(n))
                    .isEntry("main".equals(n.getNameAsString()))
                    .build());

            // Stack frame for this method
            List<VariableInfo> frameVars = new ArrayList<>(params);
            ctx.stackFrames.add(StackFrame.builder()
                    .id(nextId("sf"))
                    .methodName(n.getNameAsString())
                    .signature(n.getDeclarationAsString())
                    .depth(ctx.scopeDepth)
                    .localVariables(frameVars)
                    .range(toRange(n))
                    .virtualAddress(ctx.nextStackAddress())
                    .build());

            // Build CFG for this method
            ControlFlowGraphBuilder cfgBuilder = new ControlFlowGraphBuilder(methodId, n.getNameAsString());
            n.getBody().ifPresent(cfgBuilder::buildFromBlock);
            ctx.cfgs.put(methodId, cfgBuilder.build());

            super.visit(n, arg);
            ctx.methodCallStack.pop();
            popScope();
        }

        @Override
        public void visit(FieldDeclaration n, Void arg) {
            n.getVariables().forEach(variable -> {
                boolean isStatic = n.isStatic();
                VariableInfo varInfo = buildVariableInfo(
                        variable.getNameAsString(),
                        n.getElementType().asString(),
                        false, true, ctx.currentScope(), toRange(n));
                varInfo.setStaticField(isStatic);

                // Try to get static value from literal initializer
                variable.getInitializer().ifPresent(init -> {
                    varInfo.setStaticValue(extractLiteralValue(init));
                });

                ctx.variables.put(varInfo.getId(), varInfo);

                if (isStatic) {
                    ctx.staticArea.add(StaticAreaEntry.builder()
                            .id(nextId("static"))
                            .fieldName(variable.getNameAsString())
                            .type(n.getElementType().asString())
                            .value(varInfo.getStaticValue())
                            .virtualAddress(ctx.nextStaticAddress())
                            .build());
                }
            });
            super.visit(n, arg);
        }

        @Override
        public void visit(VariableDeclarationExpr n, Void arg) {
            n.getVariables().forEach(variable -> {
                String type = n.getElementType().asString();
                VariableInfo varInfo = buildVariableInfo(
                        variable.getNameAsString(), type, false, false,
                        ctx.currentScope(), toRange(n));

                // Try to extract static value
                variable.getInitializer().ifPresent(init -> {
                    String literalVal = extractLiteralValue(init);
                    varInfo.setStaticValue(literalVal);

                    // Handle string literals -> string pool
                    if (init instanceof StringLiteralExpr strLit) {
                        String poolId = nextId("str");
                        ctx.stringPool.add(StringPoolEntry.builder()
                                .id(poolId)
                                .value(strLit.asString())
                                .virtualAddress(ctx.nextHeapAddress())
                                .referenceCount(1)
                                .build());
                        varInfo.setHeapObjectId(poolId);
                        varInfo.setStorageKind(VariableInfo.StorageKind.STRING_POOL);
                        ctx.references.add(MemoryReference.builder()
                                .id(nextId("ref"))
                                .fromId(varInfo.getId())
                                .toId(poolId)
                                .label(variable.getNameAsString())
                                .type(MemoryReference.ReferenceType.STACK_TO_HEAP)
                                .build());
                    }

                    // Handle object creation -> heap
                    if (init instanceof ObjectCreationExpr objCreate) {
                        String heapId = nextId("heap");
                        HeapObject.CollectionKind collectionKind =
                                detectCollectionKind(objCreate.getTypeAsString());
                        HeapObject heapObj = HeapObject.builder()
                                .id(heapId)
                                .className(objCreate.getTypeAsString())
                                .kind(collectionKind != HeapObject.CollectionKind.NONE ?
                                        HeapObject.HeapObjectKind.COLLECTION : HeapObject.HeapObjectKind.OBJECT)
                                .fields(new LinkedHashMap<>())
                                .fieldTypes(new LinkedHashMap<>())
                                .fieldRefs(new LinkedHashMap<>())
                                .virtualAddress(ctx.nextHeapAddress())
                                .allocationRange(toRange(objCreate))
                                .collectionKind(collectionKind)
                                .referenceCount(1)
                                .build();
                        ctx.heapObjects.add(heapObj);
                        varInfo.setHeapObjectId(heapId);
                        varInfo.setStorageKind(VariableInfo.StorageKind.REFERENCE_STACK);

                        ctx.references.add(MemoryReference.builder()
                                .id(nextId("ref"))
                                .fromId(varInfo.getId())
                                .toId(heapId)
                                .label(variable.getNameAsString())
                                .type(MemoryReference.ReferenceType.STACK_TO_HEAP)
                                .build());

                        // Track collection usage
                        if (collectionKind != HeapObject.CollectionKind.NONE) {
                            ctx.collectionUsages.add(CollectionUsage.builder()
                                    .id(nextId("col"))
                                    .variableId(varInfo.getId())
                                    .variableName(variable.getNameAsString())
                                    .collectionKind(collectionKind)
                                    .declarationRange(toRange(n))
                                    .build());
                        }
                    }

                    // Handle array creation -> heap
                    if (init instanceof ArrayCreationExpr arrCreate) {
                        String heapId = nextId("heap");
                        ctx.heapObjects.add(HeapObject.builder()
                                .id(heapId)
                                .className(arrCreate.getElementType().asString() + "[]")
                                .kind(HeapObject.HeapObjectKind.ARRAY)
                                .arrayComponentType(arrCreate.getElementType().asString())
                                .virtualAddress(ctx.nextHeapAddress())
                                .allocationRange(toRange(arrCreate))
                                .referenceCount(1)
                                .build());
                        varInfo.setHeapObjectId(heapId);
                        varInfo.setStorageKind(VariableInfo.StorageKind.ARRAY_HEAP);
                        ctx.references.add(MemoryReference.builder()
                                .id(nextId("ref"))
                                .fromId(varInfo.getId())
                                .toId(heapId)
                                .label(variable.getNameAsString())
                                .type(MemoryReference.ReferenceType.STACK_TO_HEAP)
                                .build());
                    }

                    // Handle array initializer
                    if (init instanceof ArrayInitializerExpr arrInit) {
                        String heapId = nextId("heap");
                        List<Object> elements = arrInit.getValues().stream()
                                .map(v -> (Object) extractLiteralValue(v))
                                .toList();
                        ctx.heapObjects.add(HeapObject.builder()
                                .id(heapId)
                                .className(type)
                                .kind(HeapObject.HeapObjectKind.ARRAY)
                                .arrayComponentType(type.replace("[]", ""))
                                .arrayElements(elements)
                                .arrayLength(elements.size())
                                .virtualAddress(ctx.nextHeapAddress())
                                .allocationRange(toRange(n))
                                .referenceCount(1)
                                .build());
                        varInfo.setHeapObjectId(heapId);
                        varInfo.setStorageKind(VariableInfo.StorageKind.ARRAY_HEAP);
                        ctx.references.add(MemoryReference.builder()
                                .id(nextId("ref"))
                                .fromId(varInfo.getId())
                                .toId(heapId)
                                .label(variable.getNameAsString())
                                .type(MemoryReference.ReferenceType.STACK_TO_HEAP)
                                .build());
                    }
                });

                ctx.variables.put(varInfo.getId(), varInfo);

                // Add to current stack frame if inside a method
                addToCurrentFrame(ctx, varInfo);
            });

            // Detect stream pipelines
            n.getVariables().forEach(v ->
                v.getInitializer().ifPresent(init -> detectStreamPipeline(init, ctx)));

            super.visit(n, arg);
        }

        @Override
        public void visit(MethodCallExpr n, Void arg) {
            String callerId = ctx.currentMethod();
            if (callerId != null) {
                String calleeId = nextId("call");
                MethodInfo caller = ctx.methods.get(callerId);
                if (caller != null) {
                    caller.getCalledMethodIds().add(calleeId);
                }
                ctx.callEdges.add(CallGraph.CallGraphEdge.builder()
                        .id(nextId("edge"))
                        .callerId(callerId)
                        .calleeId(n.getNameAsString()) // resolved later
                        .callSiteRange(toRange(n))
                        .build());
            }

            // Detect Thread creation
            detectThreadCreation(n, ctx);

            super.visit(n, arg);
        }

        @Override
        public void visit(BlockStmt n, Void arg) {
            String scopeId = pushScope("Block", ScopeInfo.ScopeType.BLOCK, n);
            super.visit(n, arg);
            popScope();
        }

        @Override
        public void visit(ForStmt n, Void arg) {
            String scopeId = pushScope("for", ScopeInfo.ScopeType.FOR_STMT, n);
            super.visit(n, arg);
            popScope();
        }

        @Override
        public void visit(WhileStmt n, Void arg) {
            String scopeId = pushScope("while", ScopeInfo.ScopeType.WHILE_STMT, n);
            super.visit(n, arg);
            popScope();
        }

        @Override
        public void visit(DoStmt n, Void arg) {
            String scopeId = pushScope("do-while", ScopeInfo.ScopeType.DO_STMT, n);
            super.visit(n, arg);
            popScope();
        }

        @Override
        public void visit(TryStmt n, Void arg) {
            String scopeId = pushScope("try", ScopeInfo.ScopeType.TRY_STMT, n);
            super.visit(n, arg);
            popScope();
        }

        @Override
        public void visit(LambdaExpr n, Void arg) {
            String scopeId = pushScope("lambda", ScopeInfo.ScopeType.LAMBDA, n);
            super.visit(n, arg);
            popScope();
        }

        // =================== Helpers ===================

        private String pushScope(String name, ScopeInfo.ScopeType type,
                                 com.github.javaparser.ast.Node n) {
            String id = nextId("scope");
            String parentId = ctx.currentScope();
            int depth = ctx.scopeDepth++;

            ScopeInfo scope = ScopeInfo.builder()
                    .id(id)
                    .name(name)
                    .type(type)
                    .parentScopeId(parentId)
                    .childScopeIds(new ArrayList<>())
                    .range(toRange(n))
                    .variables(new ArrayList<>())
                    .methodIds(new ArrayList<>())
                    .depth(depth)
                    .color(SCOPE_COLORS[depth % SCOPE_COLORS.length])
                    .build();

            ctx.scopes.put(id, scope);
            if (parentId != null) {
                ScopeInfo parent = ctx.scopes.get(parentId);
                if (parent != null) parent.getChildScopeIds().add(id);
            }
            ctx.scopeStack.push(id);
            return id;
        }

        private void popScope() {
            if (!ctx.scopeStack.isEmpty()) {
                ctx.scopeStack.pop();
                ctx.scopeDepth--;
            }
        }
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private VariableInfo buildVariableInfo(String name, String type, boolean isParam,
                                           boolean isField, String scopeId, SourceRange range) {
        String id = nextId("var");
        VariableInfo.StorageKind storageKind = determineStorageKind(type);
        return VariableInfo.builder()
                .id(id)
                .name(name)
                .type(type)
                .resolvedType(type)
                .storageKind(storageKind)
                .scopeId(scopeId)
                .declarationRange(range)
                .parameter(isParam)
                .field(isField)
                .build();
    }

    private VariableInfo.StorageKind determineStorageKind(String type) {
        return switch (type) {
            case "int", "long", "short", "byte", "char", "float", "double", "boolean" ->
                    VariableInfo.StorageKind.PRIMITIVE_STACK;
            case "String" -> VariableInfo.StorageKind.STRING_POOL;
            default -> {
                if (type.endsWith("[]")) yield VariableInfo.StorageKind.ARRAY_HEAP;
                yield VariableInfo.StorageKind.REFERENCE_STACK;
            }
        };
    }

    private String extractLiteralValue(Expression expr) {
        if (expr instanceof IntegerLiteralExpr e) return e.getValue();
        if (expr instanceof LongLiteralExpr e) return e.getValue();
        if (expr instanceof DoubleLiteralExpr e) return e.getValue();
        if (expr instanceof BooleanLiteralExpr e) return String.valueOf(e.getValue());
        if (expr instanceof StringLiteralExpr e) return "\"" + e.asString() + "\"";
        if (expr instanceof NullLiteralExpr) return "null";
        if (expr instanceof CharLiteralExpr e) return "'" + e.getValue() + "'";
        return null;
    }

    private HeapObject.CollectionKind detectCollectionKind(String typeName) {
        return switch (typeName) {
            case "ArrayList" -> HeapObject.CollectionKind.ARRAY_LIST;
            case "LinkedList" -> HeapObject.CollectionKind.LINKED_LIST;
            case "HashMap" -> HeapObject.CollectionKind.HASH_MAP;
            case "HashSet" -> HeapObject.CollectionKind.HASH_SET;
            case "TreeMap" -> HeapObject.CollectionKind.TREE_MAP;
            case "TreeSet" -> HeapObject.CollectionKind.TREE_SET;
            case "LinkedHashMap" -> HeapObject.CollectionKind.LINKED_HASH_MAP;
            case "LinkedHashSet" -> HeapObject.CollectionKind.LINKED_HASH_SET;
            case "PriorityQueue" -> HeapObject.CollectionKind.PRIORITY_QUEUE;
            case "ArrayDeque", "Deque" -> HeapObject.CollectionKind.ARRAY_DEQUE;
            case "Stack" -> HeapObject.CollectionKind.STACK;
            default -> HeapObject.CollectionKind.NONE;
        };
    }

    private void detectStreamPipeline(Expression expr, AnalysisContext ctx) {
        // Detect method chain: X.stream().filter().map().collect()
        if (expr instanceof MethodCallExpr mce) {
            List<String> chain = new ArrayList<>();
            collectMethodChain(mce, chain);
            Collections.reverse(chain);
            if (chain.contains("stream") || chain.contains("of") || chain.contains("generate")) {
                List<StreamPipeline.StreamStage> stages = new ArrayList<>();
                for (int i = 0; i < chain.size(); i++) {
                    String methodName = chain.get(i);
                    StreamPipeline.StreamStage.StageType stageType = mapStreamMethod(methodName, i == 0);
                    if (stageType != null) {
                        stages.add(StreamPipeline.StreamStage.builder()
                                .id(nextId("stage"))
                                .type(stageType)
                                .label(methodName + "(...)")
                                .build());
                    }
                }
                if (stages.size() > 1) {
                    ctx.streamPipelines.add(StreamPipeline.builder()
                            .id(nextId("stream"))
                            .range(toRange(expr))
                            .stages(stages)
                            .build());
                }
            }
        }
    }

    private void collectMethodChain(Expression expr, List<String> chain) {
        if (expr instanceof MethodCallExpr mce) {
            chain.add(mce.getNameAsString());
            mce.getScope().ifPresent(scope -> collectMethodChain(scope, chain));
        }
    }

    private StreamPipeline.StreamStage.StageType mapStreamMethod(String name, boolean isFirst) {
        if (isFirst) return StreamPipeline.StreamStage.StageType.SOURCE;
        return switch (name) {
            case "filter" -> StreamPipeline.StreamStage.StageType.FILTER;
            case "map", "mapToInt", "mapToLong", "mapToDouble" -> StreamPipeline.StreamStage.StageType.MAP;
            case "flatMap" -> StreamPipeline.StreamStage.StageType.FLAT_MAP;
            case "distinct" -> StreamPipeline.StreamStage.StageType.DISTINCT;
            case "sorted" -> StreamPipeline.StreamStage.StageType.SORTED;
            case "peek" -> StreamPipeline.StreamStage.StageType.PEEK;
            case "limit" -> StreamPipeline.StreamStage.StageType.LIMIT;
            case "skip" -> StreamPipeline.StreamStage.StageType.SKIP;
            case "collect", "toList" -> StreamPipeline.StreamStage.StageType.COLLECT;
            case "forEach" -> StreamPipeline.StreamStage.StageType.FOR_EACH;
            case "reduce" -> StreamPipeline.StreamStage.StageType.REDUCE;
            case "count" -> StreamPipeline.StreamStage.StageType.COUNT;
            case "anyMatch" -> StreamPipeline.StreamStage.StageType.ANY_MATCH;
            case "allMatch" -> StreamPipeline.StreamStage.StageType.ALL_MATCH;
            case "findFirst" -> StreamPipeline.StreamStage.StageType.FIND_FIRST;
            case "min" -> StreamPipeline.StreamStage.StageType.MIN;
            case "max" -> StreamPipeline.StreamStage.StageType.MAX;
            case "stream", "of", "generate", "iterate" -> StreamPipeline.StreamStage.StageType.SOURCE;
            default -> null;
        };
    }

    private void detectThreadCreation(MethodCallExpr n, AnalysisContext ctx) {
        String name = n.getNameAsString();
        if ("start".equals(name)) {
            ctx.threadModels.add(ThreadModel.builder()
                    .id(nextId("thread"))
                    .name("Thread-" + ctx.threadModels.size())
                    .state(ThreadModel.ThreadState.NEW)
                    .declarationRange(toRange(n))
                    .build());
        }
    }

    private void addToCurrentFrame(AnalysisContext ctx, VariableInfo varInfo) {
        if (!ctx.stackFrames.isEmpty()) {
            ctx.stackFrames.get(ctx.stackFrames.size() - 1).getLocalVariables().add(varInfo);
        }
    }

    private SymbolTable buildSymbolTable(AnalysisContext ctx) {
        return SymbolTable.builder()
                .variables(ctx.variables)
                .methods(ctx.methods)
                .classes(ctx.classes)
                .imports(ctx.imports)
                .packageName(ctx.packageName)
                .build();
    }

    private MemoryModel buildMemoryModel(AnalysisContext ctx) {
        return MemoryModel.builder()
                .stackFrames(ctx.stackFrames)
                .heapObjects(ctx.heapObjects)
                .stringPool(ctx.stringPool)
                .staticArea(ctx.staticArea)
                .methodArea(ctx.methodArea)
                .references(ctx.references)
                .gcEligibleIds(new ArrayList<>())
                .build();
    }

    private CallGraph buildCallGraph(AnalysisContext ctx) {
        return CallGraph.builder()
                .nodes(ctx.callNodes)
                .edges(ctx.callEdges)
                .build();
    }

    private ClassDiagram buildClassDiagram(AnalysisContext ctx) {
        return ClassDiagram.builder()
                .classes(ctx.classNodes)
                .relationships(ctx.classEdges)
                .build();
    }

    private void detectRecursion(AnalysisContext ctx) {
        ctx.methods.forEach((id, method) -> {
            if (method.getCalledMethodIds().contains(method.getName())) {
                method.setRecursive(true);
            }
        });
    }

    private void detectGcEligible(AnalysisContext ctx) {
        Set<String> referenced = new HashSet<>();
        ctx.references.forEach(ref -> referenced.add(ref.getToId()));
        List<String> gcEligible = new ArrayList<>();
        ctx.heapObjects.forEach(obj -> {
            if (!referenced.contains(obj.getId())) {
                obj.setGcEligible(true);
                gcEligible.add(obj.getId());
            }
        });
        ctx.stringPool.forEach(str -> {
            if (!referenced.contains(str.getId())) {
                gcEligible.add(str.getId());
            }
        });
        // Update in memory model - handled at build time
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

    private AnalysisResult buildEmptyResult(ParsedResult parsed) {
        return AnalysisResult.builder()
                .analysisId(parsed.getAnalysisId())
                .timestamp(System.currentTimeMillis())
                .sourceCode(parsed.getSourceCode())
                .parseSuccess(false)
                .diagnostics(parsed.getDiagnostics())
                .scopes(Collections.emptyList())
                .symbolTable(SymbolTable.builder()
                        .variables(new HashMap<>())
                        .methods(new HashMap<>())
                        .classes(new HashMap<>())
                        .imports(new ArrayList<>())
                        .build())
                .memoryModel(MemoryModel.builder()
                        .stackFrames(new ArrayList<>())
                        .heapObjects(new ArrayList<>())
                        .stringPool(new ArrayList<>())
                        .staticArea(new ArrayList<>())
                        .methodArea(new ArrayList<>())
                        .references(new ArrayList<>())
                        .gcEligibleIds(new ArrayList<>())
                        .build())
                .callGraph(CallGraph.builder().nodes(new ArrayList<>()).edges(new ArrayList<>()).build())
                .classDiagram(ClassDiagram.builder().classes(new ArrayList<>()).relationships(new ArrayList<>()).build())
                .controlFlowGraphs(new HashMap<>())
                .streamPipelines(new ArrayList<>())
                .collectionUsages(new ArrayList<>())
                .build();
    }
}
