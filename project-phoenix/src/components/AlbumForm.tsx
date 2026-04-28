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
    <form onSubmit={handleSubmit} className="album-form relative overflow-hidden" style={{
      background: 'rgba(12, 22, 48, 0.9)',
      border: '1px solid rgba(6,182,212,0.25)',
      borderRadius: '16px',
      padding: '24px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 0 40px rgba(6,182,212,0.08), 0 16px 48px rgba(0,0,0,0.4)',
    }}>
      {/* Accent line top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)',
        opacity: 0.6,
      }} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs font-bold tracking-widest text-cyan-400/60 uppercase mb-1">
            {album ? 'Edit Record' : 'New Record'}
          </div>
          <h2 className="text-xl font-bold text-white">
            {album ? album.title : 'Add to Catalog'}
          </h2>
        </div>
        <button type="button" onClick={onCancel} style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(156,163,175,0.8)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', lineHeight: 1, transition: 'all 0.2s',
        }}>×</button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(156,163,175,0.8)', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Title
            </label>
            <input type="text" value={form.title} onChange={set('title')} placeholder="Album title" className="neon-input" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(156,163,175,0.8)', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Artist
            </label>
            <input type="text" value={form.artist} onChange={set('artist')} placeholder="Artist name" className="neon-input" />
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(156,163,175,0.8)', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Year
            </label>
            <input type="number" value={form.releaseYear} onChange={set('releaseYear')} min={1900} max={2025} className="neon-input" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(156,163,175,0.8)', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Tracks
            </label>
            <input type="number" value={form.trackCount} onChange={set('trackCount')} min={0} className="neon-input" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(156,163,175,0.8)', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Genre
            </label>
            <select value={form.genre} onChange={set('genre')} className="neon-input" style={{ cursor: 'pointer' }}>
              <option value="">Pick genre</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: '16px', padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5', fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin-slow 0.8s linear infinite' }}>
                <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="2" strokeDasharray="20 15" />
              </svg>
              Saving…
            </span>
          ) : album ? 'Save Changes' : 'Add to Catalog'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 20px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(156,163,175,0.8)',
            fontSize: '0.875rem', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
