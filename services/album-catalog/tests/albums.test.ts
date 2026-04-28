import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { albumRouter } from '../src/routes/albums.js';

// Fresh app per test suite to avoid state bleed — repository is module-level singleton
// so we import app directly for integration tests
import { app } from '../src/app.js';

describe('GET /albums', () => {
  it('returns 200 with an array', async () => {
    const res = await request(app).get('/albums');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns seeded albums on startup', async () => {
    const res = await request(app).get('/albums');
    expect(res.body.length).toBeGreaterThanOrEqual(5);
  });

  it('each album has required fields', async () => {
    const res = await request(app).get('/albums');
    for (const album of res.body) {
      expect(album).toHaveProperty('id');
      expect(album).toHaveProperty('title');
      expect(album).toHaveProperty('artist');
      expect(album).toHaveProperty('releaseYear');
      expect(album).toHaveProperty('genre');
      expect(album).toHaveProperty('trackCount');
    }
  });
});

describe('GET /albums/:id', () => {
  it('returns 200 with album when found', async () => {
    const listRes = await request(app).get('/albums');
    const id = listRes.body[0].id;

    const res = await request(app).get(`/albums/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('returns 404 when album does not exist — FIXES monolith bug of 200+null', async () => {
    const res = await request(app).get('/albums/nonexistent-id-that-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /albums', () => {
  it('creates album and returns 201 with generated id', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ title: 'New Album', artist: 'New Artist', releaseYear: 2020, genre: 'Pop', trackCount: 10 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.title).toBe('New Album');
    expect(res.body.releaseYear).toBe(2020);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ artist: 'Artist', releaseYear: 2020, genre: 'Pop', trackCount: 5 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when releaseYear is out of range', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ title: 'T', artist: 'A', releaseYear: 1800, genre: 'G', trackCount: 1 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when trackCount is negative', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ title: 'T', artist: 'A', releaseYear: 2000, genre: 'G', trackCount: -1 });
    expect(res.status).toBe(400);
  });
});

describe('PUT /albums/:id', () => {
  it('updates album and returns 200', async () => {
    const listRes = await request(app).get('/albums');
    const id = listRes.body[0].id;

    const res = await request(app)
      .put(`/albums/${id}`)
      .send({ title: 'Updated', artist: 'Updated Artist', releaseYear: 2000, genre: 'Rock', trackCount: 8 });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('returns 404 for nonexistent album', async () => {
    const res = await request(app)
      .put('/albums/does-not-exist')
      .send({ title: 'T', artist: 'A', releaseYear: 2000, genre: 'G', trackCount: 1 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /albums/:id', () => {
  it('deletes album and returns 204', async () => {
    const createRes = await request(app)
      .post('/albums')
      .send({ title: 'To Delete', artist: 'Artist', releaseYear: 2021, genre: 'Pop', trackCount: 5 });

    const id = createRes.body.id;
    const deleteRes = await request(app).delete(`/albums/${id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get(`/albums/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting nonexistent album', async () => {
    const res = await request(app).delete('/albums/not-real');
    expect(res.status).toBe(404);
  });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
