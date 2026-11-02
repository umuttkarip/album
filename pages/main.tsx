import React from 'react';
import { createRoot } from 'react-dom/client';
import AlbumApp from '../components/AlbumApp';
import '../app/album.css';

createRoot(document.getElementById('root')!).render(<AlbumApp />);
