import { useState } from 'react';
import './App.css';
import { AlbumList } from './components/AlbumList';
import { AlbumForm } from './components/AlbumForm';
import type { Album } from './types/album';

const NAV_LINKS = ['Catalog', 'Collections', 'Trending', 'Vault'];

const SIDE_NAV = [
  { icon: 'grid_view', label: 'Dashboard', active: true },
  { icon: 'library_music', label: 'Library', active: false },
  { icon: 'insights', label: 'Analytics', active: false },
  { icon: 'shopping_cart', label: 'Market', active: false },
  { icon: 'history', label: 'History', active: false },
];

const App = () => {
  const [editing, setEditing] = useState<Album | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (album: Album) => { setEditing(album); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditing(null); setRefreshKey(k => k + 1); };
  const handleCancel = () => { setShowForm(false); setEditing(null); };

  return (
    <div style={{ minHeight: '100vh', background: '#11131d' }}>

      {/* ── Top Nav ── */}
      <header style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 32px', height: '80px',
        background: 'rgba(9,9,15,0.7)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1.5rem', fontWeight: 900, fontStyle: 'italic',
            letterSpacing: '-0.05em', color: '#00dbe9',
            textShadow: '0 0 8px rgba(0,240,255,0.5)',
          }}>
            NEON_ARCHIVE
          </span>
          <nav style={{ display: 'flex', gap: '4px' }}>
            {NAV_LINKS.map((label, i) => (
              <a key={label} href="#" style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '0.875rem', letterSpacing: '-0.01em',
                color: i === 0 ? '#00dbe9' : 'rgba(113,113,122,1)',
                textDecoration: 'none',
                padding: i === 0 ? '6px 12px 4px' : '6px 12px',
                borderBottom: i === 0 ? '2px solid #00dbe9' : '2px solid transparent',
                transition: 'color 0.2s',
              }}>
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={openCreate} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(0,219,233,0.15)', color: '#00dbe9',
            border: '1px solid rgba(0,219,233,0.4)',
            padding: '8px 16px', borderRadius: '2px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            Add Album
          </button>
          <div style={{
            display: 'flex', gap: '12px', alignItems: 'center',
            borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px',
          }}>
            <button style={{ background: 'none', border: 'none', color: 'rgba(113,113,122,1)', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>notifications</span>
            </button>
            <button style={{ background: 'none', border: 'none', color: 'rgba(113,113,122,1)', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, height: '100%', width: '256px', zIndex: 40,
        background: 'rgba(9,9,15,0.8)', backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        <div style={{ height: '80px', flexShrink: 0 }} />

        <div style={{ padding: '24px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#00dbe9', boxShadow: '0 0 8px rgba(0,240,255,0.8)',
            }} />
            <span style={{ color: '#00dbe9', fontWeight: 700, fontSize: '0.875rem' }}>CORE_OS</span>
          </div>
          <span style={{ color: 'rgba(82,82,91,1)', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            V.2.0.4_ACTIVE
          </span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
          {SIDE_NAV.map(({ icon, label, active }) => (
            <a key={label} href="#" style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '12px 16px', borderRadius: '8px', textDecoration: 'none',
              fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: active ? '#00dbe9' : 'rgba(82,82,91,1)',
              background: active ? 'rgba(0,219,233,0.1)' : 'transparent',
              borderRight: active ? '4px solid #00dbe9' : '4px solid transparent',
              boxShadow: active ? 'inset 0 0 10px rgba(0,240,255,0.2)' : 'none',
              transition: 'all 0.2s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
              {label}
            </a>
          ))}
        </nav>

        <div style={{ padding: '24px', marginTop: 'auto' }}>
          <button style={{
            width: '100%', padding: '12px',
            background: 'rgba(39,39,42,0.5)', color: '#00dbe9',
            border: '1px solid rgba(0,219,233,0.3)', borderRadius: '2px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', fontWeight: 700,
          }}>
            Upgrade Node
          </button>
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[{ icon: 'help', label: 'Support' }, { icon: 'logout', label: 'Logout' }].map(({ icon, label }) => (
              <a key={label} href="#" style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                color: 'rgba(82,82,91,1)', textDecoration: 'none',
                fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                transition: 'color 0.2s',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
                {label}
              </a>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{
        marginLeft: '256px', paddingTop: '80px',
        minHeight: '100vh', position: 'relative',
        padding: '120px 48px 96px calc(256px + 48px)',
        boxSizing: 'border-box',
      }}>
        {/* Ambient glows */}
        <div style={{
          position: 'fixed', top: 0, right: 0,
          width: '600px', height: '600px',
          background: 'rgba(0,240,255,0.04)', borderRadius: '50%',
          filter: 'blur(120px)', zIndex: 0, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'fixed', bottom: 0, left: '256px',
          width: '400px', height: '400px',
          background: 'rgba(255,36,228,0.03)', borderRadius: '50%',
          filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Page heading */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#00f0ff', margin: '0 0 8px',
            }}>
              System Overview
            </p>
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 700,
              lineHeight: 1.1, letterSpacing: '-0.04em',
              color: '#e1e1f0', margin: 0,
            }}>
              Your Collection
            </h1>
          </div>

          {/* Form panel */}
          {showForm && (
            <div style={{ marginBottom: '32px' }}>
              <AlbumForm
                album={editing ?? undefined}
                onSaved={handleSaved}
                onCancel={handleCancel}
              />
            </div>
          )}

          {/* Album list */}
          <AlbumList key={refreshKey} onEdit={openEdit} />
        </div>
      </main>
    </div>
  );
};

export default App;
