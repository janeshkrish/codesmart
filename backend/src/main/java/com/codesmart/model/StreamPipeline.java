package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Represents a Java Stream API pipeline.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StreamPipeline {

    private String id;
    private SourceRange range;
    private List<StreamStage> stages;

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class StreamStage {
        private String id;
        private StageType type;
        private String label;
        private String operationCode;
        private SourceRange range;
        private String inputType;
        private String outputType;

        public enum StageType {
            SOURCE,       // list.stream(), Stream.of(...)
            FILTER,       // .filter(...)
            MAP,          // .map(...)
            FLAT_MAP,     // .flatMap(...)
            DISTINCT,     // .distinct()
            SORTED,       // .sorted(...)
            PEEK,         // .peek(...)
            LIMIT,        // .limit(n)
            SKIP,         // .skip(n)
            COLLECT,      // .collect(...)
            FOR_EACH,     // .forEach(...)
            REDUCE,       // .reduce(...)
            COUNT,        // .count()
            ANY_MATCH,    // .anyMatch(...)
            ALL_MATCH,    // .allMatch(...)
            FIND_FIRST,   // .findFirst()
            MIN, MAX,
            TO_LIST       // .toList()
        }
    }
}
