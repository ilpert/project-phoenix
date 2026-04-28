import { Router } from 'express';
import type { Request, Response } from 'express';
import { albumRepository } from '../repositories/albumRepository.js';
import type { AlbumRequest } from '../types/album.js';

export const albumRouter = Router();

function validate(body: Partial<AlbumRequest>): string | null {
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return 'title is required';
  }
  if (!body.artist || typeof body.artist !== 'string' || !body.artist.trim()) {
    return 'artist is required';
  }
  if (!body.genre || typeof body.genre !== 'string' || !body.genre.trim()) {
    return 'genre is required';
  }
  if (body.releaseYear === undefined || body.releaseYear === null) {
    return 'releaseYear is required';
  }
  const year = Number(body.releaseYear);
  if (!Number.isInteger(year) || year < 1900 || year > 2025) {
    return 'releaseYear must be an integer between 1900 and 2025';
  }
  if (body.trackCount === undefined || body.trackCount === null) {
    return 'trackCount is required';
  }
  const tracks = Number(body.trackCount);
  if (!Number.isInteger(tracks) || tracks < 0) {
    return 'trackCount must be a non-negative integer';
  }
  return null;
}

albumRouter.get('/', (_req: Request, res: Response) => {
  res.json(albumRepository.findAll());
});

albumRouter.get('/:id', (req: Request, res: Response) => {
  const album = albumRepository.findById(req.params.id);
  if (!album) {
    res.status(404).json({ error: 'Album not found' });
    return;
  }
  res.json(album);
});

albumRouter.post('/', (req: Request, res: Response) => {
  const error = validate(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const album = albumRepository.create({
    title: req.body.title.trim(),
    artist: req.body.artist.trim(),
    releaseYear: Number(req.body.releaseYear),
    genre: req.body.genre.trim(),
    trackCount: Number(req.body.trackCount),
  });
  res.status(201).json(album);
});

albumRouter.put('/:id', (req: Request, res: Response) => {
  const error = validate(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const album = albumRepository.update(req.params.id, {
    title: req.body.title.trim(),
    artist: req.body.artist.trim(),
    releaseYear: Number(req.body.releaseYear),
    genre: req.body.genre.trim(),
    trackCount: Number(req.body.trackCount),
  });
  if (!album) {
    res.status(404).json({ error: 'Album not found' });
    return;
  }
  res.json(album);
});

albumRouter.delete('/:id', (req: Request, res: Response) => {
  const deleted = albumRepository.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Album not found' });
    return;
  }
  res.status(204).send();
});
