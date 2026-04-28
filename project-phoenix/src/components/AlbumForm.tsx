import { useState } from 'react';
import { albumsApi } from '../api/albums';
import type { Album, AlbumRequest } from '../types/album';

interface Props {
  album?: Album;
  onSaved: (album: Album) => void;
  onCancel: () => void;
}

const EMPTY: AlbumRequest = {
  title: '', artist: '', releaseYear: new Date().getFullYear(), genre: '', trackCount: 0,
};

const GENRES = ['Rock', 'Pop', 'Jazz', 'Classical', 'Electronic', 'Hip-Hop', 'Country', 'Blues', 'R&B', 'Folk', 'Metal', 'Soul'];

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: '0.6rem', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: '#b9cacb', marginBottom: '8px',
  transition: 'color 0.2s',
};

export function AlbumForm({ album, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<AlbumRequest>(
    album
      ? { title: album.title, artist: album.artist, releaseYear: album.releaseYear, genre: album.genre, trackCount: album.trackCount }
      : EMPTY
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof AlbumRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = field === 'releaseYear' || field === 'trackCount' ? Number(e.target.value) : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.artist.trim()) return 'Artist is required';
    if (!form.genre.trim()) return 'Genre is required';
    if (!Number.isInteger(form.releaseYear) || form.releaseYear < 1900 || form.releaseYear > 2025) {
      return 'Release year must be between 1900 and 2025';
    }
    if (!Number.isInteger(form.trackCount) || form.trackCount < 0) {
      return 'Track count must be 0 or more';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      const saved = album
        ? await albumsApi.update(album.id, form)
        : await albumsApi.create(form);
      onSaved(saved);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="album-form glass-card"
      style={{ borderRadius: '12px', overflow: 'hidden', maxWidth: '860px' }}
    >
      {/* Accent line */}
      <div style={{
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)',
        opacity: 0.7,
      }} />

      {/* Header */}
      <div style={{
        padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(25,27,38,0.5)',
      }}>
        <div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: '#00dbe9', marginBottom: '4px',
            textShadow: '0 0 8px rgba(0,240,255,0.5)',
          }}>
            {album ? 'MODIFY_RECORD' : 'INITIALIZE_ALBUM'}
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1.25rem', fontWeight: 600, color: '#e1e1f0',
            margin: 0, lineHeight: 1.3,
          }}>
            {album ? album.title : 'Enter media coordinates into the core'}
          </h2>
        </div>
        <button
          type="button" onClick={onCancel}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(50,52,64,0.5)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#849495', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>
      </div>

      {/* Form body */}
      <div style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 48px' }}>
        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #3b494b', paddingBottom: '8px', transition: 'all 0.2s' }}>
          <label style={labelStyle}>ALBUM_TITLE</label>
          <input
            type="text" value={form.title} onChange={set('title')}
            placeholder="e.g. In Rainbows"
            className="neon-input"
          />
        </div>

        {/* Artist */}
        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #3b494b', paddingBottom: '8px' }}>
          <label style={labelStyle}>ARTIST_ENTITY</label>
          <input
            type="text" value={form.artist} onChange={set('artist')}
            placeholder="e.g. Radiohead"
            className="neon-input"
          />
        </div>

        {/* Genre */}
        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #3b494b', paddingBottom: '8px' }}>
          <label style={labelStyle}>GENRE_CLASSIFICATION</label>
          <select value={form.genre} onChange={set('genre')} className="neon-input">
            <option value="">Select</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Year + Tracks side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #3b494b', paddingBottom: '8px' }}>
            <label style={labelStyle}>CYCLE_YEAR</label>
            <input
              type="number" value={form.releaseYear} onChange={set('releaseYear')}
              min={1900} max={2025} placeholder="2007"
              className="neon-input"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #3b494b', paddingBottom: '8px' }}>
            <label style={labelStyle}>TRACK_COUNT</label>
            <input
              type="number" value={form.trackCount} onChange={set('trackCount')}
              min={0} placeholder="12"
              className="neon-input"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          margin: '0 28px 16px',
          padding: '10px 16px', borderRadius: '4px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          fontFamily: "'Spline Sans', sans-serif",
          color: '#fca5a5', fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '16px 28px 24px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(12,14,24,0.6)',
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px',
      }}>
        <button
          type="button" onClick={onCancel}
          style={{
            padding: '10px 24px', borderRadius: '2px',
            background: 'transparent', border: 'none',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#849495',
            cursor: 'pointer', transition: 'color 0.2s',
          }}
        >
          Abort Sequence
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin-slow 0.8s linear infinite' }}>
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="2" strokeDasharray="20 15" />
              </svg>
              Saving…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>data_saver_on</span>
              {album ? 'Commit Changes' : 'Commit to Archive'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
