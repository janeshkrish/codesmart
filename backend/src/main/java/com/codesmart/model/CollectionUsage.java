package com.codesmart.model;

import lombok.Builder;
import lombok.Data;

/** A collection variable usage with its runtime type. */
@Data @Builder
public class CollectionUsage {
    private String id;
    private String variableId;
    private String variableName;
    private HeapObject.CollectionKind collectionKind;
    private String elementType;
    private String keyType;
    private String valueType;
    private SourceRange declarationRange;
}
