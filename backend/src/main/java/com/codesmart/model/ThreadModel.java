package com.codesmart.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/** Represents a thread or thread pool usage. */
@Data @Builder
public class ThreadModel {
    private String id;
    private String name;
    private ThreadState state;
    private SourceRange declarationRange;
    private List<String> synchronizedOnIds;
    private List<String> lockedMonitorIds;
    private boolean isVirtual; // Java 21 virtual threads

    public enum ThreadState {
        NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED
    }
}
