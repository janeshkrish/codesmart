package com.codesmart.parser;

import com.github.javaparser.ast.Node;

/**
 * Generates plain-English explanations for AST nodes.
 */
public class ExplanationGenerator {

    public String explain(String type, String label, String sourceText) {
        return switch (type) {
            case "CompilationUnit" ->
                    "This is the top-level Java source file. It contains the package declaration, imports, and class definitions.";

            case "ClassDeclaration" ->
                    "Defines a new class named '" + extractName(label) + "'. " +
                    "A class is a blueprint for creating objects.";

            case "InterfaceDeclaration" ->
                    "Defines an interface named '" + extractName(label) + "'. " +
                    "An interface defines a contract that implementing classes must follow.";

            case "MethodDeclaration" ->
                    "Declares a method named '" + extractMethodName(label) + "'. " +
                    "A method is a block of code that performs a specific task and can be called by name.";

            case "ConstructorDeclaration" ->
                    "Defines a constructor for class '" + extractName(label) + "'. " +
                    "The constructor runs automatically when a new object is created with 'new'.";

            case "VariableDeclaration" ->
                    explainVariableDeclaration(label, sourceText);

            case "Parameter" ->
                    "A method parameter: '" + label + "'. " +
                    "Parameters receive values when the method is called.";

            case "FieldDeclaration" ->
                    "A field (class-level variable): " + label + ". " +
                    "Fields store state that belongs to the whole object.";

            case "IfStmt" ->
                    "An if-statement. The code inside the braces only runs if the condition (" +
                    extractCondition(label) + ") is true.";

            case "ForStmt" ->
                    "A for-loop. Repeats a block of code. Has an initializer, condition, and update expression.";

            case "WhileStmt" ->
                    "A while-loop. Repeats the body as long as the condition (" +
                    extractCondition(label) + ") remains true.";

            case "DoWhileStmt" ->
                    "A do-while loop. Runs the body at least once, then repeats while the condition is true.";

            case "ForEachStmt" ->
                    "An enhanced for-loop (for-each). Iterates over every element in a collection or array.";

            case "SwitchStmt" ->
                    "A switch statement. Selects one of many execution branches based on the value of the expression.";

            case "TryStmt" ->
                    "A try-catch block. The 'try' runs risky code; 'catch' handles exceptions if they occur.";

            case "ReturnStmt" ->
                    "Returns a value from the method and exits the method immediately.";

            case "ThrowStmt" ->
                    "Throws an exception, immediately interrupting normal flow.";

            case "MethodCallExpr" ->
                    "Calls the method '" + label + "'. Execution jumps into that method, runs it, and returns here.";

            case "ObjectCreationExpr" ->
                    "Creates a new object with 'new'. Memory is allocated on the heap, and the constructor is called.";

            case "ArrayCreationExpr" ->
                    "Creates a new array on the heap. Array elements are initialized to default values.";

            case "LambdaExpr" ->
                    "A lambda expression — an anonymous function. It implements a functional interface inline.";

            case "BinaryExpr" ->
                    "A binary operation: evaluates the left and right sides and applies the operator.";

            case "AssignExpr" ->
                    "Assigns a new value to the variable on the left side.";

            case "StringLiteral" ->
                    "A string literal. Java places this in the String Pool (a special area of heap memory). " +
                    "Using '==' to compare strings compares references, not values — use .equals() instead.";

            case "IntegerLiteral" ->
                    "An integer literal value: " + label + ". Stored directly in the stack frame.";

            case "NullLiteral" ->
                    "'null' means 'no object'. Reference variables set to null don't point to any object on the heap.";

            case "NameExpr" ->
                    "References the variable or field named '" + label + "'.";

            case "FieldAccess" ->
                    "Accesses the field '" + label + "' from an object.";

            default -> null;
        };
    }

    private String extractName(String label) {
        String[] parts = label.split(" ");
        return parts.length > 1 ? parts[parts.length - 1] : label;
    }

    private String extractMethodName(String label) {
        int paren = label.indexOf('(');
        if (paren > 0) {
            String[] parts = label.substring(0, paren).split(" ");
            return parts[parts.length - 1];
        }
        return label;
    }

    private String extractCondition(String label) {
        int start = label.indexOf('(');
        int end = label.lastIndexOf(')');
        if (start >= 0 && end > start) return label.substring(start + 1, end);
        return label;
    }

    private String explainVariableDeclaration(String label, String sourceText) {
        String type = label.contains(" ") ? label.split(" ")[0] : "unknown";
        boolean isPrimitive = isPrimitive(type);
        String base;
        if (isPrimitive) {
            base = "Creates a primitive variable of type '" + type + "'. " +
                   "Primitive values are stored directly on the stack frame. " +
                   "No heap allocation occurs.";
        } else if ("String".equals(type)) {
            base = "Creates a String variable. The reference is stored on the stack. " +
                   "The actual String value lives in the String Pool (part of heap memory).";
        } else {
            base = "Creates a reference variable of type '" + type + "'. " +
                   "The reference (pointer) lives on the stack. " +
                   "If initialized with 'new', the object lives on the heap.";
        }
        return base;
    }

    private boolean isPrimitive(String type) {
        return switch (type) {
            case "int", "long", "short", "byte", "char", "float", "double", "boolean" -> true;
            default -> false;
        };
    }
}
