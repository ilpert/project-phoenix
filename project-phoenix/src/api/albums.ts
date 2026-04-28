import type { Album, AlbumRequest } from '../types/album';

const BASE = (import.meta as { env: { ALBUM_API_URL?: string } }).env.ALBUM_API_URL ?? 'http://localhost:3001';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const albumsApi = {
  list: () =>
    fetch(`${BASE}/albums`).then(r => json<Album[]>(r)),

  get: (id: string) =>
    fetch(`${BASE}/albums/${id}`).then(r => json<Album>(r)),

  create: (data: AlbumRequest) =>
    fetch(`${BASE}/albums`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => json<Album>(r)),

  update: (id: string, data: AlbumRequest) =>
    fetch(`${BASE}/albums/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => json<Album>(r)),

  delete: (id: string) =>
    fetch(`${BASE}/albums/${id}`, { method: 'DELETE' }).then(r => {
      if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`);
    }),
};
