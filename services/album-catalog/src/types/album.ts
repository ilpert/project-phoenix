// AlbumResponse: what the API returns to callers
// NOTE: albumId is intentionally absent — it was a dead field in the monolith's Album entity
// NOTE: releaseYear is number — the monolith stored it as string (that was a bug)
export interface AlbumResponse {
  id: string;
  title: string;
  artist: string;
  releaseYear: number;
  genre: string;
  trackCount: number;
}

// AlbumRequest: what callers send to create or update
export interface AlbumRequest {
  title: string;
  artist: string;
  releaseYear: number;
  genre: string;
  trackCount: number;
}

// Internal storage type
export interface Album extends AlbumResponse {}
