import { useState } from 'react';
import './App.css';
import { AlbumList } from './components/AlbumList';
import { AlbumForm } from './components/AlbumForm';
import type { Album } from './types/album';

const App = () => {
  const [editing, setEditing] = useState<Album | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (album: Album) => { setEditing(album); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditing(null); setRefreshKey(k => k + 1); };
  const handleCancel = () => { setShowForm(false); setEditing(null); };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(2,9,23,0.85)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Vinyl logo */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #1a1a2e, #0e7490, #1a1a2e, #0e7490, #1a1a2e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(6,182,212,0.4)',
            flexShrink: 0,
          }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: 'radial-gradient(circle, #06b6d4, #0e7490)',
            }} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(6,182,212,0.7)', textTransform: 'uppercase' }}>
              Northwind Logistics
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', lineHeight: 1.1 }}>
              Album Catalog
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Service badge */}
          <div style={{
            padding: '4px 10px', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 600,
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
            color: '#6ee7b7', letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            Node.js API
          </div>

          <button onClick={openCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
            Add Album
          </button>
        </div>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: '860px', margin: '0 auto' }}>
        {/* Page title */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontSize: '1.75rem', fontWeight: 800, color: 'white', margin: 0,
            background: 'linear-gradient(135deg, #fff 40%, #67e8f9)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Your Collection
          </h1>
          <p style={{ color: 'rgba(156,163,175,0.7)', fontSize: '0.875rem', marginTop: '6px' }}>
            Powered by the new Node.js microservice · <span style={{ color: 'rgba(6,182,212,0.8)' }}>releaseYear: number</span> · <span style={{ color: 'rgba(6,182,212,0.8)' }}>proper 404s</span>
          </p>
        </div>

        {showForm && (
          <div style={{ marginBottom: '24px' }}>
            <AlbumForm
              album={editing ?? undefined}
              onSaved={handleSaved}
              onCancel={handleCancel}
            />
          </div>
        )}

        <AlbumList key={refreshKey} onEdit={openEdit} />
      </main>
    </div>
  );
};

export default App;
