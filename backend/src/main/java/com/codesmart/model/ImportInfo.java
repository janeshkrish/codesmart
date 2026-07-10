package com.codesmart.model;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class ImportInfo {
    private String id;
    private String importDeclaration;
    private boolean isStatic;
    private boolean isAsterisk;
    private SourceRange range;
}
