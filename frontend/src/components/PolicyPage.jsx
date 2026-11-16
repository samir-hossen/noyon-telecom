import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';
import { policyPageContent, policyPageJsonLd } from '../content/policyPages.js';

function InlineParts({ parts }) {
  return parts.map((part, index) => <Fragment key={index}>{index > 0 && part.text !== '.' ? ' ' : ''}{part.href ? <Link to={part.href}>{part.text}</Link> : part.text}</Fragment>);
}

export default function PolicyPage({ policyKey }) {
  const { t } = useLanguage();
  const page = policyPageContent(policyKey, t);
  usePageMeta(page.title, page.description, undefined, page.path, { id: 'policy', data: policyPageJsonLd(page) });
  return <div className="container">
    <div className="page-header">
      <span className="eyebrow">{t('terms.legal')}</span>
      <h1 className="page-title">{page.title}</h1>
    </div>
    <div className="legal-content">
      <p><em>{page.updated}</em></p>
      {page.sections.map((section) => <section key={section.title}>
        <h2>{section.title}</h2>
        {section.blocks.map((block, index) => {
          if (block.type === 'p') return <p key={index}><InlineParts parts={block.parts} /></p>;
          const List = block.type;
          return <List key={index}>{block.items.map((parts, item) => <li key={item}><InlineParts parts={parts} /></li>)}</List>;
        })}
      </section>)}
    </div>
  </div>;
}
