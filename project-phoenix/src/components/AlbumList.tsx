import { useState, useEffect } from 'react';
import { albumsApi } from '../api/albums';
import type { Album } from '../types/album';

const GENRE_COLORS: Record<string, string> = {
  rock: 'rgba(239,68,68,0.15)',
  pop: 'rgba(168,85,247,0.15)',
  jazz: 'rgba(245,158,11,0.15)',
  classical: 'rgba(16,185,129,0.15)',
  electronic: 'rgba(6,182,212,0.15)',
  'hip-hop': 'rgba(251,113,133,0.15)',
  country: 'rgba(234,179,8,0.15)',
  blues: 'rgba(99,102,241,0.15)',
};

function genreStyle(genre: string) {
  const key = genre.toLowerCase();
  const bg = GENRE_COLORS[key] ?? 'rgba(107,114,128,0.15)';
  return { background: bg };
}

function Vinyl() {
  return (
    <div className="vinyl">
      <div className="vinyl-center" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5">
      <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 rounded w-1/3" />
        <div className="skeleton h-3 rounded w-1/2" />
      </div>
    </div>
  );
}

interface AlbumCardProps {
  album: Album;
  index: number;
  onDelete: (id: string) => void;
  onEdit: (album: Album) => void;
}

function AlbumCard({ album, index, onDelete, onEdit }: AlbumCardProps) {
  const [confirming, setConfirming] = useState(false);

  const handleDelete = () => {
    if (!confirming) { setConfirming(true); return; }
    onDelete(album.id);
  };

  return (
    <div
      className="album-card flex items-center gap-4 p-4"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <Vinyl />

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white truncate leading-tight">{album.title}</div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-sm text-gray-400">{album.artist}</span>
          <span className="text-gray-600">·</span>
          <span className="text-sm font-mono text-cyan-400">{album.releaseYear}</span>
          <span className="text-gray-600">·</span>
          <span className="genre-badge" style={genreStyle(album.genre)}>{album.genre}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="track-badge">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <circle cx="5" cy="5" r="1.5"/>
          </svg>
          {album.trackCount}
        </span>

        <button
          onClick={() => onEdit(album)}
          className="text-xs text-gray-500 hover:text-cyan-400 transition-colors px-2 py-1 rounded hover:bg-cyan-400/10"
        >
          Edit
        </button>

        <button
          onClick={handleDelete}
          onBlur={() => setConfirming(false)}
          className={`text-xs px-2 py-1 rounded transition-all ${
            confirming
              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
              : 'text-gray-600 hover:text-red-400 hover:bg-red-500/10'
          }`}
        >
          {confirming ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

interface Props {
  onEdit: (album: Album) => void;
}

export function AlbumList({ onEdit }: Props) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    albumsApi.list()
      .then(setAlbums)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = albums.filter(a =>
    search.length < 2 ? true :
    [a.title, a.artist, a.genre].some(f =>
      f.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleDelete = async (id: string) => {
    await albumsApi.delete(id);
    setAlbums(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div>
      {/* Search + stats row */}
      <div className="flex items-center gap-3 mb-6">
        <div className="search-wrapper flex-1">
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8.5" cy="8.5" r="5.75"/>
              <path d="M13.25 13.25L17 17"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by title, artist, or genre…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="neon-input search-input"
          />
        </div>
        {!loading && (
          <div className="stat-pill">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <circle cx="6" cy="6" r="2"/>
            </svg>
            {albums.length} {albums.length === 1 ? 'album' : 'albums'}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="empty-state text-center py-16">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-red-400 font-medium">{error}</div>
          <div className="text-gray-600 text-sm mt-1">Check that the album-catalog service is running on port 3001</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state text-center py-16">
          <div className="text-5xl mb-4 opacity-30">💿</div>
          <div className="text-gray-400 font-medium">
            {search ? `No albums match "${search}"` : 'No albums yet'}
          </div>
          <div className="text-gray-600 text-sm mt-1">
            {search ? 'Try a different search term' : 'Hit "+ Add Album" to get started'}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((album, i) => (
            <AlbumCard
              key={album.id}
              album={album}
              index={i}
              onDelete={handleDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
