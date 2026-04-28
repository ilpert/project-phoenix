// Album types for the new service — defined locally, never imported from the monolith
// albumId does NOT exist here (dead field in monolith)
// releaseYear is number (monolith stored it as string — that was a bug)
export interface Album {
  id: string;
  title: string;
  artist: string;
  releaseYear: number;
  genre: string;
  trackCount: number;
}

export interface AlbumRequest {
  title: string;
  artist: string;
  releaseYear: number;
  genre: string;
  trackCount: number;
}
