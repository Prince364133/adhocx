import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import type { JSX } from 'react';

export default function Home(): JSX.Element {
  return (
    <Layout>
      <main>
        <section className="adhocx-hero">
          <div className="adhocx-hero__eyebrow">AdhocX Technical Knowledge Hub</div>
          <h1>Enterprise mobility, clearly documented.</h1>
          <p className="adhocx-hero__subtitle">
            Product, architecture, API, engineering, operations and application
            knowledge for the AdhocX commercial mobility platform.
          </p>
          <div className="adhocx-hero__actions">
            <Link className="button button--primary button--lg" to="/docs/platform">
              Explore platform
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/apps">
              Browse applications
            </Link>
          </div>
        </section>

        <section className="adhocx-grid" aria-label="Documentation areas">
          <article className="adhocx-card">
            <div className="adhocx-card__icon" aria-hidden="true">01</div>
            <h2>Platform</h2>
            <p>Product scope, architecture, security, design, engineering standards and operations.</p>
            <Link to="/docs/platform">Open platform docs</Link>
          </article>
          <article className="adhocx-card">
            <div className="adhocx-card__icon" aria-hidden="true">02</div>
            <h2>Applications</h2>
            <p>API, Admin, Ops, Corporate, Employee, ETS, Mobile and Marketing application references.</p>
            <Link to="/docs/apps">View the application catalog</Link>
          </article>
          <article className="adhocx-card">
            <div className="adhocx-card__icon" aria-hidden="true">03</div>
            <h2>API Reference</h2>
            <p>Live Swagger/OpenAPI reference and backend endpoint, workflow and integration documentation.</p>
            <Link to="/docs/apps/api/reference/swagger">Open API reference</Link>
          </article>
        </section>
      </main>
    </Layout>
  );
}
