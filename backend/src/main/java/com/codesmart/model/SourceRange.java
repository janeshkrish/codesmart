package com.codesmart.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Source code position range (line/column, 1-indexed).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SourceRange {
    private int startLine;
    private int startColumn;
    private int endLine;
    private int endColumn;
    private int startOffset;
    private int endOffset;
}
