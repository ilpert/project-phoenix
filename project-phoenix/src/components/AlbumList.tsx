import { useState, useEffect } from 'react';
import { albumsApi } from '../api/albums';
import type { Album } from '../types/album';

const GENRE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  rock:       { bg: 'rgba(239,68,68,0.1)',    color: '#fca5a5', border: 'rgba(239,68,68,0.25)' },
  pop:        { bg: 'rgba(168,85,247,0.1)',   color: '#d8b4fe', border: 'rgba(168,85,247,0.25)' },
  jazz:       { bg: 'rgba(245,158,11,0.1)',   color: '#fcd34d', border: 'rgba(245,158,11,0.25)' },
  classical:  { bg: 'rgba(16,185,129,0.1)',   color: '#6ee7b7', border: 'rgba(16,185,129,0.25)' },
  electronic: { bg: 'rgba(0,240,255,0.1)',    color: '#7df4ff', border: 'rgba(0,240,255,0.2)' },
  'hip-hop':  { bg: 'rgba(251,113,133,0.1)',  color: '#fda4af', border: 'rgba(251,113,133,0.25)' },
  country:    { bg: 'rgba(234,179,8,0.1)',    color: '#fde047', border: 'rgba(234,179,8,0.25)' },
  blues:      { bg: 'rgba(99,102,241,0.1)',   color: '#a5b4fc', border: 'rgba(99,102,241,0.25)' },
};

function genreStyle(genre: string) {
  const key = genre.toLowerCase();
  return GENRE_COLORS[key] ?? { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: 'rgba(107,114,128,0.25)' };
}

function SkeletonCard() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px',
      padding: '16px 20px', borderRadius: '12px',
      background: 'rgba(27,27,31,0.4)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      borderRight: '1px solid rgba(0,0,0,0.2)',
      borderBottom: '1px solid rgba(0,0,0,0.2)',
    }}>
      <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton" style={{ height: '14px', width: '35%' }} />
        <div className="skeleton" style={{ height: '11px', width: '55%' }} />
      </div>
    </div>
  );
}

function VinylDisc() {
  return (
    <div style={{
      width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
      background: `conic-gradient(
        from 0deg,
        #1a1a2e 0deg 30deg, #16213e 30deg 60deg, #0f3460 60deg 90deg,
        #1a1a2e 90deg 120deg, #16213e 120deg 150deg, #0f3460 150deg 180deg,
        #1a1a2e 180deg 210deg, #16213e 210deg 240deg, #0f3460 240deg 270deg,
        #1a1a2e 270deg 300deg, #16213e 300deg 330deg, #0f3460 330deg 360deg
      )`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 0 2px rgba(0,240,255,0.15)',
      transition: 'transform 0.6s ease, box-shadow 0.3s ease',
    }}>
      <div style={{
        width: '12px', height: '12px', borderRadius: '50%',
        background: 'radial-gradient(circle, #00dbe9, #006970)',
        boxShadow: '0 0 6px rgba(0,240,255,0.5)',
      }} />
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
  const gStyle = genreStyle(album.genre);

  return (
    <div
      className="album-card glass-panel"
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '14px 20px', borderRadius: '10px',
        animationDelay: `${index * 55}ms`,
      }}
    >
      <VinylDisc />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600, color: '#e1e1f0',
          fontSize: '0.95rem', lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {album.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Spline Sans', sans-serif", fontSize: '0.8rem', color: '#b9cacb' }}>
            {album.artist}
          </span>
          <span style={{ color: '#3b494b', fontSize: '0.7rem' }}>·</span>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.75rem', fontWeight: 600, color: '#00dbe9',
            letterSpacing: '0.02em',
          }}>
            {album.releaseYear}
          </span>
          <span style={{ color: '#3b494b', fontSize: '0.7rem' }}>·</span>
          <span className="genre-badge" style={{
            background: gStyle.bg, color: gStyle.color, borderColor: gStyle.border,
          }}>
            {album.genre}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span className="track-badge">
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>album</span>
          {album.trackCount}
        </span>

        <button
          onClick={() => onEdit(album)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'rgba(82,82,91,1)',
            padding: '4px 10px', borderRadius: '2px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.color = '#00dbe9';
            (e.target as HTMLButtonElement).style.background = 'rgba(0,219,233,0.08)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.color = 'rgba(82,82,91,1)';
            (e.target as HTMLButtonElement).style.background = 'none';
          }}
        >
          Edit
        </button>

        <button
          onClick={() => { if (!confirming) { setConfirming(true); } else { onDelete(album.id); } }}
          onBlur={() => setConfirming(false)}
          style={{
            background: confirming ? 'rgba(239,68,68,0.12)' : 'none',
            border: confirming ? '1px solid rgba(239,68,68,0.35)' : '1px solid transparent',
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: confirming ? '#fca5a5' : 'rgba(82,82,91,1)',
            padding: '4px 10px', borderRadius: '2px',
            transition: 'all 0.2s',
          }}
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
      {/* Search + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div className="search-wrapper" style={{ flex: 1 }}>
          <span className="search-icon">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
          </span>
          <input
            type="text"
            placeholder="Query archive…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        {!loading && (
          <span className="stat-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>album</span>
            {albums.length} {albums.length === 1 ? 'album' : 'albums'}
          </span>
        )}
      </div>

      {/* Section heading */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '16px', paddingLeft: '8px',
        borderLeft: '2px solid #00f0ff',
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#b9cacb',
        }}>
          Recent Archives
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '64px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#849495', marginBottom: '16px', display: 'block' }}>
            signal_disconnected
          </span>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#ffb4ab', fontWeight: 600, marginBottom: '6px' }}>
            {error}
          </div>
          <div style={{ fontFamily: "'Spline Sans', sans-serif", color: '#849495', fontSize: '0.875rem' }}>
            Check that the album-catalog service is running on port 3001
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '64px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#3b494b', marginBottom: '16px', display: 'block' }}>
            album
          </span>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#b9cacb', fontWeight: 600, marginBottom: '6px' }}>
            {search ? `No albums match "${search}"` : 'No albums yet'}
          </div>
          <div style={{ fontFamily: "'Spline Sans', sans-serif", color: '#849495', fontSize: '0.875rem' }}>
            {search ? 'Try a different search term' : 'Hit "Add Album" to initialize the archive'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
