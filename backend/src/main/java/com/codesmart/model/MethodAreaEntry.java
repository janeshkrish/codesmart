package com.codesmart.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data @Builder
public class MethodAreaEntry {
    private String id;
    private String className;
    private String fullyQualifiedName;
    private List<String> methodSignatures;
    private List<String> fieldSignatures;
    private long virtualAddress;
}
