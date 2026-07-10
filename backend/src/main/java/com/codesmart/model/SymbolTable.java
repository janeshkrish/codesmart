package com.codesmart.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Complete symbol table: all named entities in the source.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SymbolTable {

    /** All variables (local, field, param) keyed by id */
    private Map<String, VariableInfo> variables;

    /** All methods keyed by id */
    private Map<String, MethodInfo> methods;

    /** All classes keyed by id */
    private Map<String, ClassInfo> classes;

    /** All imports */
    private List<ImportInfo> imports;

    /** Package declaration */
    private String packageName;
}
