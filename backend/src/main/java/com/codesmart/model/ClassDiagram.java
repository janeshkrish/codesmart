package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * UML Class Diagram data - all classes, relationships.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ClassDiagram {

    private List<ClassDiagramNode> classes;
    private List<ClassDiagramEdge> relationships;

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ClassDiagramNode {
        private String id;
        private String name;
        private String fullyQualifiedName;
        private ClassInfo.ClassKind kind;
        private List<String> fields;       // "- name: String"
        private List<String> methods;      // "+ getName(): String"
        private List<String> typeParameters;
    }

    @Data
    @Builder
    public static class ClassDiagramEdge {
        private String id;
        private String sourceId;
        private String targetId;
        private RelationshipType type;
        private String label;
        private String sourceMultiplicity;
        private String targetMultiplicity;
    }

    public enum RelationshipType {
        INHERITANCE,       // extends (solid line + hollow arrow)
        IMPLEMENTATION,    // implements (dashed line + hollow arrow)
        COMPOSITION,       // filled diamond
        AGGREGATION,       // hollow diamond
        DEPENDENCY,        // dashed arrow
        ASSOCIATION,       // solid arrow
        REALIZATION        // dashed line + hollow arrow (same as implementation visually)
    }
}
