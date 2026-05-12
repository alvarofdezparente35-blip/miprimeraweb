import './style.css';

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  author: string;
  created: string;
}

async function loadPosts(): Promise<void> {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/posts');
    const posts: Post[] = await res.json();

    if (posts.length === 0) {
      grid.innerHTML = '<div class="blog-empty"><span class="emoji">📝</span>No hay artículos aún. Vuelve pronto.</div>';
      return;
    }

    grid.innerHTML = posts.map(p => {
      const date = new Date(p.created).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      const slug = p.slug || p.id;
      return `<a href="/blog/${encodeURIComponent(slug)}" class="blog-card">
        <div class="blog-card-img">${p.image || '📰'}</div>
        <div class="blog-card-body">
          <div class="blog-card-date">${date}</div>
          <div class="blog-card-title">${esc(p.title)}</div>
          <div class="blog-card-excerpt">${esc(p.excerpt || p.title)}</div>
          <div class="blog-card-author">✍️ ${esc(p.author || 'LumiCharge')}</div>
        </div>
      </a>`;
    }).join('');
  } catch {
    grid.innerHTML = '<div class="blog-empty"><span class="emoji">⚠️</span>Error al cargar los artículos.</div>';
  }
}

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadPosts);
