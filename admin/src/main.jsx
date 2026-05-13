import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [message, setMessage] = useState('Loading admin greeting...');

  useEffect(() => {
    fetch('/api/hello/admin')
      .then((response) => response.json())
      .then((data) => setMessage(data.text))
      .catch(() => setMessage('Could not reach the KartClaw API yet.'));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <section className="max-w-2xl rounded-3xl border border-fuchsia-400/30 bg-white/10 p-10 text-center shadow-2xl shadow-fuchsia-500/10 backdrop-blur">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-fuchsia-300">
          KartClaw Admin
        </p>
        <h1 className="text-4xl font-black sm:text-6xl">{message}</h1>
        <p className="mt-6 text-zinc-300">
          This admin React + Vite + Tailwind page fetched its text from the Hono API.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
