import './style.css';

interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  image: string;
  author: string;
  created: string;
}

async function loadPost(): Promise<void> {
  const container = document.getElementById('postContainer');
  if (!container) return;

  const slug = window.location.pathname.replace('/blog/', '');
  if (!slug) { container.innerHTML = '<div class="loading">Artículo no encontrado</div>'; return; }

  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) { container.innerHTML = '<div class="loading">Artículo no encontrado</div>'; return; }

    const post: Post = await res.json();
    const date = new Date(post.created).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    document.title = post.title + ' — LumiCharge';
    const descEl = document.getElementById('pageDesc');
    if (descEl) descEl.setAttribute('content', post.excerpt || post.title);

    container.innerHTML = `
      <span class="post-image">${post.image || '📰'}</span>
      <div class="post-meta">
        <span class="post-date">${date}</span> · <span class="post-author">${esc(post.author || 'LumiCharge')}</span>
      </div>
      <h1 class="post-title">${esc(post.title)}</h1>
      <div class="post-excerpt">${esc(post.excerpt || '')}</div>
      <div class="post-content">${post.content}</div>
      <div class="post-cta">
        <p>¿Te ha gustado este artículo? Descubre LumiCharge Pro, el cargador inalámbrico 50W que está revolucionando los escritorios.</p>
        <a href="/#comprar" class="btn-primary" style="background:#C9A84C;color:#0A0A0F;border:none;padding:.85rem 2rem;border-radius:6px;font-size:.9rem;font-weight:500;cursor:pointer;text-decoration:none;display:inline-block;letter-spacing:.06em;">Ver LumiCharge Pro →</a>
      </div>
    `;
  } catch {
    container.innerHTML = '<div class="loading">Error al cargar el artículo</div>';
  }
}

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadPost);
