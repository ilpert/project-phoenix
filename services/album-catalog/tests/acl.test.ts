/**
 * THE FENCE — ACL Contract Tests
 *
 * These tests enforce the anti-corruption layer between the monolith and this service.
 * They FAIL LOUDLY if any monolith field leaks into this service's API.
 *
 * Guarded invariants (see adr/002-acl-boundary.md):
 *   1. albumId must NOT appear in any API response (dead field from monolith)
 *   2. releaseYear must be type number (monolith stored it as string — that was a bug)
 *
 * If these tests fail, stop. Do not merge. See adr/002-acl-boundary.md for context.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('ACL Contract: albumId must not leak from monolith', () => {
  it('GET /albums — no album in the list response contains albumId', async () => {
    const res = await request(app).get('/albums');
    expect(res.status).toBe(200);

    const albums = res.body as Record<string, unknown>[];
    expect(albums.length).toBeGreaterThan(0);

    for (const album of albums) {
      expect(album).not.toHaveProperty('albumId');
    }
  });

  it('GET /albums/:id — single album response does not contain albumId', async () => {
    const listRes = await request(app).get('/albums');
    const id = listRes.body[0].id as string;

    const res = await request(app).get(`/albums/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('albumId');
  });

  it('POST /albums — created album response does not contain albumId', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ title: 'ACL Test', artist: 'Test Artist', releaseYear: 2020, genre: 'Test', trackCount: 1 });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('albumId');
  });
});

describe('ACL Contract: releaseYear must be number, not string', () => {
  it('GET /albums — all releaseYear values are typeof number', async () => {
    const res = await request(app).get('/albums');
    expect(res.status).toBe(200);

    const albums = res.body as Record<string, unknown>[];
    expect(albums.length).toBeGreaterThan(0);

    for (const album of albums) {
      expect(typeof album.releaseYear).toBe('number');
      // Extra guard: not a numeric string like "1984"
      expect(typeof album.releaseYear).not.toBe('string');
    }
  });

  it('GET /albums/:id — releaseYear is typeof number', async () => {
    const listRes = await request(app).get('/albums');
    const id = listRes.body[0].id as string;

    const res = await request(app).get(`/albums/${id}`);
    expect(typeof res.body.releaseYear).toBe('number');
  });

  it('POST /albums — returned releaseYear is typeof number even when sent as string', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ title: 'Type Test', artist: 'A', releaseYear: '1999', genre: 'G', trackCount: 5 });

    // Should coerce string input to number in response
    if (res.status === 201) {
      expect(typeof res.body.releaseYear).toBe('number');
    }
  });
});

describe('ACL Contract: 404 behavior — fixes monolith 200+null bug', () => {
  it('GET /albums/:nonexistent returns 404, not 200', async () => {
    const res = await request(app).get('/albums/this-id-does-not-exist-at-all');
    // MONOLITH BUG: returned 200 with null body
    // THIS SERVICE: returns 404 with error message
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
