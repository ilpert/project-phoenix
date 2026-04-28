package org.cloudfoundry.samples.music.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Characterization (behavior-pinning) tests for AlbumController.
 *
 * These tests pin the CURRENT behavior of the monolith, including its bugs.
 * They are NOT correctness tests. They exist so that unintentional behavior
 * changes are caught immediately with a message that says exactly what changed.
 *
 * Do not "fix" a failing test by changing the assertion to match new behavior
 * without first understanding whether the behavior change was intentional.
 *
 * Tests marked with "PINNED BUG:" document known incorrect behavior that is
 * preserved intentionally to avoid breaking callers during the migration window.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AlbumControllerCharacterizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testGetAllAlbums_returns29SeedAlbums() throws Exception {
        // Pins: seeded data set size. Fails if AlbumRepositoryPopulator changes albums.json
        mockMvc.perform(get("/albums"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(29)));
    }

    @Test
    void testGetAllAlbums_firstAlbumHasExpectedShape() throws Exception {
        // Pins: the JSON shape of an album response includes all known fields
        mockMvc.perform(get("/albums"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].title").exists())
                .andExpect(jsonPath("$[0].artist").exists())
                .andExpect(jsonPath("$[0].releaseYear").exists())
                .andExpect(jsonPath("$[0].genre").exists())
                .andExpect(jsonPath("$[0].trackCount").exists());
    }

    @Test
    void testAlbumJsonShape_includesAlbumIdField() throws Exception {
        // PINNED BUG: albumId is a dead field (always null) that appears in every API response.
        // It is never set by any code path. The new service (album-catalog) does not have this field.
        // We pin it here so changes to the serialization are detected explicitly.
        mockMvc.perform(get("/albums"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].albumId").exists()); // exists but null
    }

    @Test
    void testReleaseYear_serializedAsString() throws Exception {
        // PINNED BUG: releaseYear is typed as String in the Album entity.
        // Valid years like "1967" are stored and returned as JSON strings, not numbers.
        // The new service (album-catalog) corrects this to number type.
        mockMvc.perform(get("/albums"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].releaseYear", isA(String.class)));
    }

    @Test
    void testGetAlbumById_notFound_returns200WithNull() throws Exception {
        // PINNED BUG: GET /albums/{nonexistent-id} returns HTTP 200 with a null body.
        // This is caused by AlbumController.java:43 — repository.findById(id).orElse(null).
        // The correct behavior is HTTP 404. The new service (album-catalog) fixes this.
        // We pin this bug so any future fix to the monolith is intentional and detected.
        MvcResult result = mockMvc.perform(get("/albums/this-id-does-not-exist-anywhere"))
                .andExpect(status().isOk()) // BUG: should be 404
                .andReturn();

        String body = result.getResponse().getContentAsString();
        // Body is empty or "null" — not a 404 response
        org.junit.jupiter.api.Assertions.assertTrue(
                body.isEmpty() || body.equals("null"),
                "PINNED BUG violated: expected empty or 'null' body for missing album, got: " + body
        );
    }

    @Test
    void testCreateAlbum_put_returnsAlbumWithGeneratedId() throws Exception {
        // Pins: PUT /albums creates a new album (note: PUT is used for creation, POST for update)
        // This is the inverse of REST convention — pinned explicitly.
        mockMvc.perform(put("/albums")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Pin Test Album\",\"artist\":\"Pin Artist\",\"releaseYear\":\"2020\",\"genre\":\"Test\",\"trackCount\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.title").value("Pin Test Album"));
    }

    @Test
    void testUpdateAlbum_post_returnsUpdatedAlbum() throws Exception {
        // First create via PUT
        MvcResult createResult = mockMvc.perform(put("/albums")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Before Update\",\"artist\":\"Artist\",\"releaseYear\":\"2019\",\"genre\":\"Rock\",\"trackCount\":8}"))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = createResult.getResponse().getContentAsString();
        // Extract id from response — simple substring approach to avoid Jackson dependency in tests
        int idStart = responseBody.indexOf("\"id\":\"") + 6;
        int idEnd = responseBody.indexOf("\"", idStart);
        String id = responseBody.substring(idStart, idEnd);

        // Pins: POST /albums updates an existing album (note: POST is used for update, not creation)
        mockMvc.perform(post("/albums")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"" + id + "\",\"title\":\"After Update\",\"artist\":\"Artist\",\"releaseYear\":\"2019\",\"genre\":\"Rock\",\"trackCount\":8}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("After Update"));
    }

    @Test
    void testDeleteAlbum_returns200() throws Exception {
        // First create via PUT
        MvcResult createResult = mockMvc.perform(put("/albums")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"To Delete\",\"artist\":\"Artist\",\"releaseYear\":\"2021\",\"genre\":\"Pop\",\"trackCount\":3}"))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = createResult.getResponse().getContentAsString();
        int idStart = responseBody.indexOf("\"id\":\"") + 6;
        int idEnd = responseBody.indexOf("\"", idStart);
        String id = responseBody.substring(idStart, idEnd);

        // Pins: DELETE /albums/{id} returns 200 with empty body (not 204)
        mockMvc.perform(delete("/albums/" + id))
                .andExpect(status().isOk());
    }
}
