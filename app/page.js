'use client';

import { useEffect, useMemo, useState } from 'react';

const authStore = 'ceo-auth';

export default function Home() {
  const [config, setConfig] = useState(null);
  const [auth, setAuth] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('login');
  const [showStudio, setShowStudio] = useState(false);
  const [busy, setBusy] = useState(false);
  const token = auth?.access_token;
  const userEmail = auth?.user?.email;

  useEffect(() => {
    const saved = localStorage.getItem(authStore);
    if (saved) { try { setAuth(JSON.parse(saved)); } catch {} }
    fetch('/api/config').then(r => r.json()).then(setConfig);
    loadTracks();
  }, []);

  async function loadTracks() {
    const data = await fetch('/api/tracks', { cache: 'no-store' }).then(r => r.json());
    if (data.tracks) setTracks(data.tracks);
    else if (data.error) setMessage(data.error);
  }

  async function submitAuth(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const email = form.get('email'); const password = form.get('password');
    const path = mode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
    try {
      const response = await fetch(`${config.url}${path}`, { method:'POST', headers:{ apikey:config.anonKey, 'Content-Type':'application/json' }, body:JSON.stringify({email,password}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || data.error_description || data.message || 'Authentication failed.');
      if (data.access_token) { localStorage.setItem(authStore, JSON.stringify(data)); setAuth(data); setMessage('Signed in. Your creator studio is ready.'); }
      else setMessage('Account created. Check your email to verify it, then sign in.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function uploadTrack(event) {
    event.preventDefault(); setBusy(true); setMessage('Uploading your files…');
    try {
      const response = await fetch('/api/tracks', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:new FormData(event.currentTarget) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Upload failed.');
      event.currentTarget.reset(); setMessage('Track published to the C.E.O. catalog.'); setShowStudio(false); await loadTracks();
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  function logout() { localStorage.removeItem(authStore); setAuth(null); setShowStudio(false); setMessage('Signed out.'); }
  const artistCount = useMemo(() => new Set(tracks.map(t => t.artist_name)).size, [tracks]);

  return <>
    <header className="nav wrap"><a className="logo" href="#top">C.E.O.</a><nav><a href="#music">Music</a><a href="#creators">Creators</a><a href="#about">About</a></nav><button className="navButton" onClick={() => token ? setShowStudio(true) : document.querySelector('#account')?.scrollIntoView({behavior:'smooth'})}>{token ? 'Upload music' : 'Creator login'}</button></header>
    <main id="top">
      <section className="hero wrap"><div><span className="eyebrow">N-Dependant Productions presents</span><h1>Create Every <em>Opportunity.</em></h1><p>A real independent creator platform for music, beats, albums, and creative services. Creators control their work and set their own prices.</p><div className="actions"><button onClick={() => document.querySelector('#music')?.scrollIntoView({behavior:'smooth'})}>Explore music</button><button className="ghost" onClick={() => token ? setShowStudio(true) : document.querySelector('#account')?.scrollIntoView({behavior:'smooth'})}>Upload your work</button></div><div className="stats"><span><b>{tracks.length}</b> tracks</span><span><b>{artistCount}</b> creators</span><span><b>100%</b> independent</span></div></div><div className="orb"><strong>C.E.O.</strong><small>No label required</small></div></section>

      <section className="section wrap" id="music"><div className="sectionHead"><div><span className="eyebrow">New releases</span><h2>Music marketplace</h2></div><button className="ghost" onClick={loadTracks}>Refresh catalog</button></div>{tracks.length ? <div className="trackGrid">{tracks.map(track => <article className="track" key={track.id}><div className="cover" style={track.artwork_url ? {backgroundImage:`url(${track.artwork_url})`} : {}}>{!track.artwork_url && 'C.E.O.'}</div><div className="trackBody"><span className="genre">{track.genre || 'Independent'}</span><h3>{track.title}</h3><p>{track.artist_name}</p><audio controls preload="metadata" src={track.audio_url}/><div className="price">{Number(track.price) ? `$${Number(track.price).toFixed(2)}` : 'Free preview'}</div></div></article>)}</div> : <div className="empty"><h3>Your catalog starts here.</h3><p>Create an account and publish the first C.E.O. release.</p></div>}</section>

      <section className="section wrap" id="creators"><span className="eyebrow">Featured creators</span><h2>Independent by design.</h2><div className="creatorGrid"><article><div className="avatar">K</div><div><h3>Koldest</h3><p>@koldest0188</p></div><b>{tracks.filter(t=>t.artist_name.toLowerCase().includes('koldest')).length} songs</b></article><article><div className="avatar note">♪</div><div><h3>Your artist profile</h3><p>Upload to join the catalog</p></div><b>Creator-set pricing</b></article></div></section>

      <section className="section account wrap" id="account"><div><span className="eyebrow">Creator account</span><h2>{token ? 'Welcome to your studio.' : mode === 'login' ? 'Sign in to upload.' : 'Create your account.'}</h2><p>{token ? `Signed in as ${userEmail}` : 'Your music and artwork are stored securely and remain in the public catalog after you leave.'}</p></div>{token ? <div className="accountActions"><button onClick={()=>setShowStudio(true)}>Open upload studio</button><button className="ghost" onClick={logout}>Sign out</button></div> : <form className="authForm" onSubmit={submitAuth}><label>Email<input name="email" type="email" required/></label><label>Password<input name="password" type="password" minLength="6" required/></label><button disabled={!config || busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button><button type="button" className="textButton" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode === 'login' ? 'Need an account? Sign up' : 'Already registered? Sign in'}</button></form>}</section>
      <section className="section wrap" id="about"><span className="eyebrow">No label required</span><h2>Creator ownership comes first.</h2><p className="wide">C.E.O. is being built for independent artists and creative professionals who want to present their work, choose their pricing, and build direct opportunities. Uploading is live; payments and public creator payouts will be activated only after testing and verification.</p></section>
    </main>
    {message && <div className="toast" role="status"><span>{message}</span><button onClick={()=>setMessage('')}>×</button></div>}
    {showStudio && <div className="modal" role="dialog" aria-modal="true"><form className="studio" onSubmit={uploadTrack}><button className="close" type="button" onClick={()=>setShowStudio(false)}>×</button><span className="eyebrow">Creator studio</span><h2>Publish a track</h2><div className="formGrid"><label>Artist name<input name="artist" defaultValue="Koldest" required/></label><label>Track title<input name="title" required/></label><label>Genre<input name="genre" placeholder="Hip-hop, R&B…"/></label><label>Price (USD)<input name="price" type="number" min="0" step="0.01" defaultValue="0"/></label><label className="full">Audio file (MP3, WAV, M4A; max 100 MB)<input name="audio" type="file" accept="audio/*,.mp3,.wav,.m4a" required/></label><label className="full">Cover artwork<input name="artwork" type="file" accept="image/*"/></label></div><button disabled={busy}>{busy ? 'Uploading…' : 'Publish to C.E.O.'}</button></form></div>}
    <footer className="wrap"><span>© 2026 N-Dependant Productions</span><div><a href="#">Terms</a><a href="#">Privacy</a><a href="#">Refunds</a><a href="#">Copyright / DMCA</a></div></footer>
  </>;
}
