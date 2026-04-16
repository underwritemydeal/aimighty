import { useEffect, useState } from 'react';
import { beliefSystems } from '../../data/beliefSystems';
import { normalizeBeliefId } from '../../config/beliefSystems';
import { fetchWithTimeout } from '../../services/fetchWithTimeout';

interface ArticlePageProps {
  belief: string;
  slug: string;
  onBackToHome: () => void;
  onEnterApp: () => void;
}

interface ArticleBody {
  metaDescription: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  closing: string;
  cta: string;
}

interface Article {
  title: string;
  metaDescription: string;
  slug: string;
  belief: string;
  topic: string;
  topicDisplay: string;
  date: string;
  body: ArticleBody;
  url: string;
}

const WORKER_URL = 'https://aimighty-api.robby-hess.workers.dev';

export function ArticlePage({ belief, slug: _slug, onBackToHome, onEnterApp }: ArticlePageProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizeBeliefId(belief);
  const beliefData = beliefSystems.find((b) => b.id === normalized);
  const accentColor = beliefData?.accentColor || '#d4af37';
  const imagePath = beliefData?.imagePath || `/images/avatars/${normalized}.jpg`;

  useEffect(() => {
    // 15s budget for article JSON.
    fetchWithTimeout(`${WORKER_URL}/daily-article?belief=${encodeURIComponent(normalized)}`, {}, 15000)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Article) => setArticle(data))
      .catch((e) => setError(String(e)));
  }, [normalized]);

  // Inject SEO meta tags directly into <head>
  useEffect(() => {
    if (!article) return;
    const canonicalUrl = `https://aimightyme.com/${normalized}/${article.slug}`;

    document.title = `${article.title} | AImighty`;

    const setMeta = (selector: string, attr: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!el) {
        if (selector.startsWith('meta')) {
          el = document.createElement('meta');
          const [, key, val] = /\[(\w+)="([^"]+)"\]/.exec(selector) || [];
          if (key && val) (el as HTMLMetaElement).setAttribute(key, val);
          document.head.appendChild(el);
        } else if (selector.startsWith('link')) {
          el = document.createElement('link');
          (el as HTMLLinkElement).rel = 'canonical';
          document.head.appendChild(el);
        }
      }
      if (el) el.setAttribute(attr, content);
    };

    setMeta('meta[name="description"]', 'content', article.metaDescription);
    setMeta('meta[property="og:title"]', 'content', article.title);
    setMeta('meta[property="og:description"]', 'content', article.metaDescription);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:image"]', 'content', `https://aimightyme.com${imagePath}`);
    setMeta('meta[property="og:type"]', 'content', 'article');
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', article.title);
    setMeta('meta[name="twitter:description"]', 'content', article.metaDescription);
    setMeta('link[rel="canonical"]', 'href', canonicalUrl);

    // JSON-LD structured data
    const existing = document.getElementById('article-jsonld');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'article-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.metaDescription,
      url: canonicalUrl,
      image: `https://aimightyme.com${imagePath}`,
      publisher: {
        '@type': 'Organization',
        name: 'AImighty',
        url: 'https://aimightyme.com',
      },
      datePublished: article.date,
      dateModified: article.date,
      inLanguage: 'en-US',
    });
    document.head.appendChild(script);

    return () => {
      const s = document.getElementById('article-jsonld');
      if (s) s.remove();
    };
  }, [article, normalized, imagePath]);

  return (
    <div
      className="relative"
      style={{
        background: 'var(--color-void)',
        minHeight: '100dvh',
        color: 'rgba(255,248,240,0.95)',
      }}
    >
      {/* Background image — subtle for articles */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          backgroundImage: `url(${imagePath})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          filter: 'saturate(0.6) brightness(0.5) blur(6px)',
          opacity: 0.35,
          zIndex: 0,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(3,3,8,0.7) 0%, rgba(3,3,8,0.92) 100%)',
          zIndex: 1,
        }}
      />

      <div className="relative" style={{ zIndex: 2 }}>
        {/* Top nav */}
        <nav
          className="flex items-center justify-between"
          style={{
            padding: '16px 24px',
            paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)',
          }}
        >
          <button
            onClick={onBackToHome}
            className="px-3 py-2 rounded-lg hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}
          >
            ← Home
          </button>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 300,
              letterSpacing: '0.05em',
            }}
          >
            <span style={{ color: '#d4af37' }}>AI</span>
            <span style={{ color: 'rgba(255,248,240,0.95)' }}>mighty</span>
          </div>
          <button
            onClick={onEnterApp}
            className="px-3 py-2 rounded-lg"
            style={{
              background: accentColor,
              color: '#0a0a0f',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            Open App
          </button>
        </nav>

        <article
          className="mx-auto"
          style={{
            maxWidth: '720px',
            padding: '40px 24px 80px',
          }}
        >
          {error && (
            <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
              Unable to load this article. <button onClick={onBackToHome} style={{ color: accentColor, textDecoration: 'underline' }}>Go home</button>
            </p>
          )}

          {!article && !error && (
            <p style={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', padding: '60px 0' }}>
              Loading wisdom…
            </p>
          )}

          {article && (
            <>
              <div
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: accentColor,
                  marginBottom: '16px',
                }}
              >
                {article.date} · {beliefData?.name || normalized}
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  fontWeight: 300,
                  lineHeight: 1.15,
                  color: 'rgba(255,248,240,0.98)',
                  marginBottom: '24px',
                }}
              >
                {article.title}
              </h1>

              <p
                style={{
                  fontFamily: 'var(--font-body, Outfit)',
                  fontSize: '1.1rem',
                  lineHeight: 1.8,
                  color: 'rgba(255,248,240,0.8)',
                  marginBottom: '40px',
                  fontStyle: 'italic',
                }}
              >
                {article.body.intro}
              </p>

              {article.body.sections?.map((s, i) => (
                <section key={i} style={{ marginBottom: '40px' }}>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.55rem',
                      fontWeight: 400,
                      color: accentColor,
                      marginBottom: '14px',
                      lineHeight: 1.3,
                    }}
                  >
                    {s.heading}
                  </h2>
                  <p
                    style={{
                      fontFamily: 'var(--font-body, Outfit)',
                      fontSize: '1rem',
                      lineHeight: 1.85,
                      color: 'rgba(255,248,240,0.85)',
                    }}
                  >
                    {s.body}
                  </p>
                </section>
              ))}

              {article.body.closing && (
                <p
                  style={{
                    fontFamily: 'var(--font-body, Outfit)',
                    fontSize: '1rem',
                    lineHeight: 1.8,
                    color: 'rgba(255,248,240,0.85)',
                    marginBottom: '40px',
                  }}
                >
                  {article.body.closing}
                </p>
              )}

              {article.body.cta && (
                <div
                  className="text-center"
                  style={{
                    padding: '32px 24px',
                    background: `linear-gradient(135deg, ${accentColor}22, rgba(3,3,8,0.6))`,
                    border: `1px solid ${accentColor}40`,
                    borderRadius: '16px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.3rem',
                      fontWeight: 300,
                      color: 'rgba(255,248,240,0.95)',
                      marginBottom: '20px',
                      lineHeight: 1.4,
                    }}
                  >
                    {article.body.cta}
                  </p>
                  <button
                    onClick={onEnterApp}
                    className="px-6 py-3 rounded-full"
                    style={{
                      background: accentColor,
                      color: '#0a0a0f',
                      fontFamily: 'var(--font-body, Outfit)',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                    }}
                  >
                    Talk to {beliefData?.name || 'God'}
                  </button>
                </div>
              )}
            </>
          )}
        </article>

        <footer
          className="text-center"
          style={{
            padding: '40px 24px 60px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'var(--font-body, Outfit)',
            fontSize: '0.8rem',
          }}
        >
          <div>© 2026 AImighty · Every belief. One voice.</div>
        </footer>
      </div>
    </div>
  );
}
