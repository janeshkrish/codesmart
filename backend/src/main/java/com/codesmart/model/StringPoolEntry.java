package com.codesmart.model;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class StringPoolEntry {
    private String id;
    private String value;
    private long virtualAddress;
    private int referenceCount;
}
