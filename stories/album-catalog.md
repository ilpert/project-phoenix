# Album Catalog — User Stories

Product owner: Northwind Logistics internal tooling team  
Tester: QA guild  
Last updated: 2026-04-28

---

## Story 1: Browse the Album Catalog

**As a** music library manager  
**I want** to see all albums in the catalog  
**So that** I can get an overview of the current collection and identify gaps

### Acceptance Criteria

- **Given** the catalog has albums, **When** I open the album list view, **Then** I see all albums with title, artist, year, and genre visible
- **Given** the catalog is empty, **When** I open the album list view, **Then** I see an empty state message ("No albums yet. Add one to get started.") rather than a blank screen
- **Given** I am viewing the album list, **When** the page loads, **Then** release year is displayed as a number (e.g., "1984"), not as a string with quotes
- **Given** there are more than 20 albums, **When** the list loads, **Then** albums are paginated or virtually scrolled — the page does not freeze
- **Given** the backend is unavailable, **When** I open the album list, **Then** I see a clear error message, not a blank page or console error

### Stakeholder Notes
Engineering wants server-side pagination from day one. PM says the current catalog is under 100 albums and wants to ship faster. **Agreed: client-side pagination for v1, server-side in v2. This must be captured in the API design so GET /albums can add `?page=&limit=` params without breaking clients.**

---

## Story 2: Add a New Album

**As a** music library manager  
**I want** to add a new album to the catalog  
**So that** the collection stays current when new titles are acquired

### Acceptance Criteria

- **Given** I submit a new album with title, artist, release year, genre, and track count, **When** the form is submitted, **Then** the album appears immediately in the catalog list with a server-assigned unique ID
- **Given** I submit with a missing required field (title, artist, or genre), **When** I click submit, **Then** the field is highlighted with an error message before the form is sent — no round-trip to the server
- **Given** I enter a release year outside 1900–2025, **When** I click submit, **Then** I see "Release year must be between 1900 and 2025"
- **Given** I enter a negative track count, **When** I click submit, **Then** I see "Track count cannot be negative"
- **Given** I submit a valid album, **When** the server responds, **Then** the release year in the response is a number (not a string), and there is no `albumId` field in the response

### Stakeholder Notes
None on this story — validation rules are uncontested.

---

## Story 3: Update Album Details

**As a** music library manager  
**I want** to correct or update an album's details  
**So that** catalog information stays accurate when errors are found

### Acceptance Criteria

- **Given** I am viewing an album, **When** I click "Edit" and change the title, **Then** the updated title is saved and immediately reflected in the list view
- **Given** I edit an album and change the release year to a valid number, **When** I save, **Then** the year is stored and displayed as a number
- **Given** I attempt to save an edit with an invalid release year (e.g., "19xx"), **When** I click save, **Then** the form shows a validation error and the server is not called
- **Given** I start editing an album and click "Cancel", **When** the cancellation is confirmed, **Then** the album retains its original values with no changes saved
- **Given** the album does not exist (deleted by another user), **When** I try to save my edit, **Then** I see "This album no longer exists" and the item is removed from my view

### Stakeholder Notes
None on this story.

---

## Story 4: Delete an Album

**As a** music library manager  
**I want** to remove an album from the catalog  
**So that** the collection only contains relevant titles

### Acceptance Criteria

- **Given** I click "Delete" on an album, **When** a confirmation dialog appears, **Then** I must confirm before the deletion proceeds — no single-click deletion
- **Given** I confirm deletion, **When** the server responds, **Then** the album is immediately removed from the list view and a success notification appears
- **Given** the delete request fails, **When** the error is received, **Then** the album remains visible and I see an actionable error message
- **Given** I delete an album, **When** I refresh the page, **Then** the album is no longer present

### Stakeholder Notes
**OPEN DISAGREEMENT — not smoothed over:**
- **PM position:** Soft-delete (mark as deleted, keep data). Reason: support has asked for "undo delete" multiple times; GDPR right-to-erasure can be handled with a separate purge job.
- **Ops position:** Hard-delete. Reason: soft-deletes accumulate indefinitely, complicate queries, and GDPR requires confirmed erasure with an audit trail that a soft-delete flag does not provide alone.
- **Engineering position:** Either is implementable; the decision affects the DB schema and the API (soft-delete needs a `deleted_at` filter on GET /albums).

**Current decision: hard-delete in v1.** Revisit when a support ticket requires undo. The API should return 404 (not 410 Gone) for deleted album IDs so clients do not need to handle the distinction.

---

## Story 5: Search Albums by Artist or Genre

**As a** music library manager  
**I want** to search or filter albums by artist name or genre  
**So that** I can quickly find albums in a large catalog without scrolling through everything

### Acceptance Criteria

- **Given** I type in the search box, **When** I have entered 2 or more characters, **Then** the album list filters to show only albums where the artist name or genre contains the search term (case-insensitive)
- **Given** my search matches no albums, **When** the filter is applied, **Then** I see "No albums match '[search term]'" — not a blank list
- **Given** I clear the search box, **When** the input is empty, **Then** the full album list is restored without a page reload
- **Given** I search for "rock", **When** results display, **Then** albums with genre "Rock", "Hard Rock", and "Punk Rock" all appear (substring match, not exact)
- **Given** the album list has more than 50 albums, **When** I search, **Then** filtering happens client-side with no additional network request for v1

### Stakeholder Notes
PM wants search to also cover album title. Engineering says that makes the filter logic slightly more complex but agrees it's the right UX. **Agreed: search covers title, artist, and genre in v1. The API's `?q=` query param (when added) should mirror this scope.**
