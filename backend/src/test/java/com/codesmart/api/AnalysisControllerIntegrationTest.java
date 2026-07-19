package com.codesmart.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AnalysisControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void analyzesValidJavaAndReturnsTheAst() throws Exception {
        String source = "public class Main { public static void main(String[] args) { int value = 1; } }";
        String request = "{\"sessionId\":\"integration-test\",\"source\":\"" + source + "\",\"fileName\":\"Main.java\"}";

        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parseSuccess").value(true))
                .andExpect(jsonPath("$.astRoot.type").value("CompilationUnit"))
                .andExpect(jsonPath("$.symbolTable.classes").exists());
    }
}
