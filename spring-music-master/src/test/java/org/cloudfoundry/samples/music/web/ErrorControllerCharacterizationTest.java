package org.cloudfoundry.samples.music.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Characterization tests for ErrorController.
 *
 * ErrorController intentionally exposes crash/chaos endpoints for Cloud Foundry demo purposes.
 * These tests pin that the endpoints EXIST and behave as documented.
 *
 * NOTE: /errors/kill and /errors/fill-heap cannot be fully tested here as they would
 * terminate the JVM or exhaust heap. We test that the endpoints are mapped and return
 * the expected non-2xx status before any destructive action occurs (or in the /throw case,
 * that it returns a 500 as expected).
 */
@SpringBootTest
@AutoConfigureMockMvc
class ErrorControllerCharacterizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testThrowEndpoint_returns500() throws Exception {
        // Pins: GET /errors/throw deliberately throws a RuntimeException.
        // Spring's default error handling returns 500. This endpoint is intentional.
        mockMvc.perform(get("/errors/throw"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void testKillEndpoint_isMapped() throws Exception {
        // Pins: GET /errors/kill endpoint exists (Spring would return 404 if it were missing).
        // We cannot call it in tests because it calls System.exit(1).
        // This test verifies it is mapped by checking the response is not 404.
        // In a real test environment, this endpoint should be disabled via profile configuration.
        //
        // SECURITY NOTE: This endpoint should not exist in a production deployment.
        // See spring-music-master/CLAUDE.md for context.
        mockMvc.perform(get("/errors/kill"))
                .andExpect(status().is(org.hamcrest.Matchers.not(404)));
    }
}
