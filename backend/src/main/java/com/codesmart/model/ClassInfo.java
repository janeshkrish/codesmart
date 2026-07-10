package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Represents a class or interface declaration.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ClassInfo {

    private String id;
    private String name;
    private String fullyQualifiedName;
    private ClassKind kind;
    private List<String> modifiers;
    private String superclassId;
    private String superclassName;
    private List<String> interfaceIds;
    private List<String> interfaceNames;
    private List<VariableInfo> fields;
    private List<String> methodIds;
    private List<String> innerClassIds;
    private String scopeId;
    private SourceRange range;
    private String explanation;
    private boolean isGeneric;
    private List<String> typeParameters;

    public enum ClassKind {
        CLASS, INTERFACE, ABSTRACT_CLASS, ENUM, RECORD, ANNOTATION
    }
}
