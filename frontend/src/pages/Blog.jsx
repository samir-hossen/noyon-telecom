import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';
import { getAllPosts } from '../content/blogPosts';

export default function Blog() {
  const posts = [...getAllPosts()].sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));

  usePageMeta(
    'পার্টস কেনাকাটা ও সার্ভিসিং গাইড',
    'মোবাইল স্পেয়ার পার্টস চেনা, পাইকারি কেনা, আর সার্ভিসিং ব্যবসা নিয়ে ব্যবহারিক গাইড — ডিলার, দোকান ও সার্ভিস সেন্টারের জন্য।',
    undefined,
    '/blog'
  );

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">গাইড ও টিপস</span>
        <h1 className="page-title">
          পার্টস কেনাকাটা ও <em>সার্ভিসিং গাইড</em>
        </h1>
        <p style={{ color: '#6b5f59', maxWidth: 620 }}>
          মোবাইল স্পেয়ার পার্টস চেনা, পাইকারি কেনা, আর সার্ভিসিং ব্যবসা চালানো নিয়ে ব্যবহারিক লেখা — ডিলার, দোকান মালিক ও সার্ভিস সেন্টারের জন্য।
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, paddingBottom: 60 }}>
        {posts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="form-panel"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>
              {new Date(post.publishedDate).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h3 style={{ marginBottom: 8, lineHeight: 1.4 }}>{post.title}</h3>
            <p style={{ color: '#6b5f59', lineHeight: 1.6 }}>{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
