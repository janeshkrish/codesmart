package com.codesmart.model;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class StaticAreaEntry {
    private String id;
    private String className;
    private String fieldName;
    private String type;
    private Object value;
    private String heapObjectId;
    private long virtualAddress;
}
