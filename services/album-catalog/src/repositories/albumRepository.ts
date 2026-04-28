import { v4 as uuidv4 } from 'uuid';
import type { Album, AlbumRequest } from '../types/album.js';

const store = new Map<string, Album>();

// Seed data — migrated from spring-music monolith with schema fixes applied:
//   releaseYear: number (was string in monolith — that was a bug)
//   trackCount: real values (was always 0 in monolith)
//   albumId: absent (was always null in monolith — dead field, dropped)
const SEED: Omit<Album, 'id'>[] = [
  { title: 'Nevermind',                    artist: 'Nirvana',                    releaseYear: 1991, genre: 'Rock',        trackCount: 13 },
  { title: 'Pet Sounds',                   artist: 'The Beach Boys',              releaseYear: 1966, genre: 'Rock',        trackCount: 13 },
  { title: "What's Going On",              artist: 'Marvin Gaye',                 releaseYear: 1971, genre: 'Soul',        trackCount: 9  },
  { title: 'Are You Experienced?',         artist: 'Jimi Hendrix Experience',     releaseYear: 1967, genre: 'Rock',        trackCount: 11 },
  { title: 'The Joshua Tree',              artist: 'U2',                          releaseYear: 1987, genre: 'Rock',        trackCount: 11 },
  { title: 'Abbey Road',                   artist: 'The Beatles',                 releaseYear: 1969, genre: 'Rock',        trackCount: 17 },
  { title: 'Rumours',                      artist: 'Fleetwood Mac',               releaseYear: 1977, genre: 'Rock',        trackCount: 11 },
  { title: 'Sun Sessions',                 artist: 'Elvis Presley',               releaseYear: 1976, genre: 'Rock',        trackCount: 14 },
  { title: 'Thriller',                     artist: 'Michael Jackson',             releaseYear: 1982, genre: 'Pop',         trackCount: 9  },
  { title: 'Exile on Main Street',         artist: 'The Rolling Stones',          releaseYear: 1972, genre: 'Rock',        trackCount: 18 },
  { title: 'Born to Run',                  artist: 'Bruce Springsteen',           releaseYear: 1975, genre: 'Rock',        trackCount: 8  },
  { title: 'London Calling',               artist: 'The Clash',                   releaseYear: 1979, genre: 'Punk',        trackCount: 19 },
  { title: 'Hotel California',             artist: 'The Eagles',                  releaseYear: 1976, genre: 'Rock',        trackCount: 9  },
  { title: 'Led Zeppelin',                 artist: 'Led Zeppelin',                releaseYear: 1969, genre: 'Rock',        trackCount: 9  },
  { title: 'IV',                           artist: 'Led Zeppelin',                releaseYear: 1971, genre: 'Rock',        trackCount: 8  },
  { title: 'Synchronicity',               artist: 'The Police',                  releaseYear: 1983, genre: 'Rock',        trackCount: 10 },
  { title: 'Achtung Baby',                 artist: 'U2',                          releaseYear: 1991, genre: 'Rock',        trackCount: 12 },
  { title: 'Let it Bleed',                 artist: 'The Rolling Stones',          releaseYear: 1969, genre: 'Rock',        trackCount: 9  },
  { title: 'Rubber Soul',                  artist: 'The Beatles',                 releaseYear: 1965, genre: 'Rock',        trackCount: 14 },
  { title: 'The Ramones',                  artist: 'The Ramones',                 releaseYear: 1976, genre: 'Punk',        trackCount: 14 },
  { title: 'A Night at the Opera',         artist: 'Queen',                       releaseYear: 1975, genre: 'Rock',        trackCount: 12 },
  { title: "Don't Look Back",              artist: 'Boston',                      releaseYear: 1978, genre: 'Rock',        trackCount: 7  },
  { title: "Singin' The Blues",            artist: 'BB King',                     releaseYear: 1957, genre: 'Blues',       trackCount: 12 },
  { title: 'Born Under a Bad Sign',        artist: 'Albert King',                 releaseYear: 1967, genre: 'Blues',       trackCount: 10 },
  { title: 'Folk Singer',                  artist: 'Muddy Waters',                releaseYear: 1964, genre: 'Blues',       trackCount: 11 },
  { title: 'Rock With Me',                 artist: 'The Fabulous Thunderbirds',   releaseYear: 1979, genre: 'Blues',       trackCount: 10 },
  { title: 'King of the Delta Blues',      artist: 'Robert Johnson',              releaseYear: 1961, genre: 'Blues',       trackCount: 16 },
  { title: 'Texas Flood',                  artist: 'Stevie Ray Vaughan',          releaseYear: 1983, genre: 'Blues',       trackCount: 9  },
  { title: "Couldn't Stand the Weather",  artist: 'Stevie Ray Vaughan',          releaseYear: 1984, genre: 'Blues',       trackCount: 10 },
  // Additional classics not in the monolith — added during migration
  { title: 'Kind of Blue',                 artist: 'Miles Davis',                 releaseYear: 1959, genre: 'Jazz',        trackCount: 5  },
  { title: 'Purple Rain',                  artist: 'Prince',                      releaseYear: 1984, genre: 'Pop/Rock',    trackCount: 11 },
  { title: 'OK Computer',                  artist: 'Radiohead',                   releaseYear: 1997, genre: 'Alternative', trackCount: 12 },
];

for (const album of SEED) {
  const id = uuidv4();
  store.set(id, { id, ...album });
}

export const albumRepository = {
  findAll(): Album[] {
    return Array.from(store.values());
  },

  findById(id: string): Album | undefined {
    return store.get(id);
  },

  create(data: AlbumRequest): Album {
    const id = uuidv4();
    const album: Album = { id, ...data };
    store.set(id, album);
    return album;
  },

  update(id: string, data: AlbumRequest): Album | undefined {
    if (!store.has(id)) return undefined;
    const updated: Album = { id, ...data };
    store.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return store.delete(id);
  },
};
