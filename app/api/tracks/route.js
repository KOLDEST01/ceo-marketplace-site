import { NextResponse } from 'next/server';
import { db, ensureSetup, requireUser, storeFile } from '../../../lib/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await ensureSetup();
    const tracks = await db()`select id, artist_name, title, genre, price, audio_url, artwork_url, created_at from ceo_tracks order by created_at desc limit 100`;
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('[tracks:get]', error);
    return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureSetup();
    const user = await requireUser(request);
    const form = await request.formData();
    const audio = form.get('audio');
    const artwork = form.get('artwork');
    const title = String(form.get('title') || '').trim();
    const artist = String(form.get('artist') || '').trim();
    const genre = String(form.get('genre') || '').trim();
    const price = Math.max(0, Number(form.get('price') || 0));
    if (!title || !artist || !audio || typeof audio === 'string') throw new Error('Artist, title, and an audio file are required.');
    if (!audio.type.startsWith('audio/')) throw new Error('Please select an MP3, WAV, M4A, or other audio file.');
    if (audio.size > 50 * 1024 * 1024) throw new Error('Audio files must be 50 MB or smaller for this test release.');
    const audioUrl = await storeFile(audio, 'audio', user.id);
    let artworkUrl = null;
    if (artwork && typeof artwork !== 'string' && artwork.size) {
      if (!artwork.type.startsWith('image/')) throw new Error('Artwork must be an image file.');
      artworkUrl = await storeFile(artwork, 'artwork', user.id);
    }
    const [track] = await db()`insert into ceo_tracks (user_id, artist_name, title, genre, price, audio_url, artwork_url) values (${user.id}, ${artist}, ${title}, ${genre}, ${price}, ${audioUrl}, ${artworkUrl}) returning *`;
    return NextResponse.json({ track }, { status: 201 });
  } catch (error) {
    console.error('[tracks:post]', error);
    return NextResponse.json({ error: String(error.message || error) }, { status: 400 });
  }
}
