import { Link, useParams } from 'react-router-dom';
import { getPostBySlug, getAllPosts } from '../content/blogPosts';
import { usePageMeta } from '../hooks/usePageTitle';
import { categoryUrl } from '../utils/taxonomy';

function ContentBlock({ block, i }) {
  if (block.type === 'h2') return <h2 key={i} style={{ marginTop: 28, marginBottom: 10, fontSize: '1.2rem' }}>{block.text}</h2>;
  if (block.type === 'ul') {
    return (
      <ul key={i} style={{ lineHeight: 1.8, color: '#4a413c', paddingLeft: 22, marginBottom: 14 }}>
        {block.items.map((item, j) => <li key={j}>{item}</li>)}
      </ul>
    );
  }
  return <p key={i} style={{ lineHeight: 1.8, color: '#4a413c', marginBottom: 14 }}>{block.text}</p>;
}

export default function BlogPost() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);
  const origin = window.location.origin;

  usePageMeta(
    post ? post.title : 'গাইড পাওয়া যায়নি',
    post ? post.metaDescription : 'এই গাইডটি খুঁজে পাওয়া যায়নি — অন্য গাইড দেখতে আমাদের ব্লগ পাতায় যান।',
    undefined,
    post ? `/blog/${post.slug}` : undefined,
    post
      ? [
          {
            id: 'article',
            data: {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: post.title,
              description: post.metaDescription,
              datePublished: post.publishedDate,
              dateModified: post.updatedDate || post.publishedDate,
              author: { '@type': 'Organization', name: 'Noyon Telecom' },
              publisher: { '@type': 'Organization', name: 'Noyon Telecom', logo: { '@type': 'ImageObject', url: `${origin}/apple-touch-icon.png` } },
              mainEntityOfPage: `${origin}/blog/${post.slug}`,
            },
          },
          {
            id: 'breadcrumb',
            data: {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
                { '@type': 'ListItem', position: 2, name: 'গাইড ও টিপস', item: `${origin}/blog` },
                { '@type': 'ListItem', position: 3, name: post.title, item: `${origin}/blog/${post.slug}` },
              ],
            },
          },
        ]
      : undefined,
    !post
  );

  if (!post) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="icon">📄</div>
          <h3>গাইডটি খুঁজে পাওয়া যায়নি</h3>
          <p style={{ marginBottom: 24 }}>এই লেখাটি সরিয়ে ফেলা হয়েছে অথবা লিংকটি ভুল।</p>
          <Link to="/blog" className="btn btn-primary">সব গাইড দেখুন</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <span className="eyebrow">গাইড ও টিপস</span>
        <h1 className="page-title" style={{ fontSize: '1.7rem' }}>{post.title}</h1>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          {new Date(post.publishedDate).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="form-panel wide" style={{ maxWidth: 760 }}>
        {post.content.map((block, i) => <ContentBlock key={i} block={block} i={i} />)}

        {post.relatedCategories?.length > 0 && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
            <strong style={{ fontSize: '0.9rem' }}>সংশ্লিষ্ট ক্যাটাগরি:</strong>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              {post.relatedCategories.map((cat) => (
                <Link key={cat} to={categoryUrl(cat)} className="btn btn-outline btn-sm">
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {post.relatedSlugs?.length > 0 && (
        <div className="form-panel wide" style={{ maxWidth: 760, marginTop: 20 }}>
          <strong style={{ fontSize: '0.9rem' }}>আরও পড়ুন:</strong>
          <div style={{ marginTop: 10 }}>
            {post.relatedSlugs.map((slug) => {
              const related = getAllPosts().find((p) => p.slug === slug);
              if (!related) return null;
              return (
                <p key={slug} style={{ marginBottom: 6 }}>
                  <Link to={`/blog/${related.slug}`}>{related.title}</Link>
                </p>
              );
            })}
          </div>
        </div>
      )}

      <div className="form-panel wide" style={{ maxWidth: 760, marginTop: 20, textAlign: 'center' }}>
        <p style={{ marginBottom: 16 }}>দরকারি পার্টস খুঁজছেন? পুরো ক্যাটালগ ঘুরে দেখুন।</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/shop" className="btn btn-berry">ক্যাটালগ দেখুন</Link>
          <Link to="/blog" className="btn btn-outline">আরও গাইড পড়ুন</Link>
        </div>
      </div>
    </div>
  );
}
