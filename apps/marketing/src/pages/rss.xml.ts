import type { APIRoute } from 'astro';

interface BlogArticle {
  slug: string;
  title: string;
  summary: string;
  date: string;
  author: string;
  category: string;
}

const SEED_ARTICLES: BlogArticle[] = [
  {
    slug: 'how-adhocx-reverse-auction-cuts-enterprise-cab-costs',
    title: 'How Automated Algorithmic Dispatch Cuts Enterprise Corporate Cab Costs',
    category: 'Corporate Mobility',
    date: '2026-10-15T00:00:00.000Z',
    author: 'AdhocX Fleet Operations Research',
    summary: 'Discover how programmatic driver pairing and instant fulfillment eliminate middlemen broker markups for corporate logistics and spot employee transit in Hyderabad.'
  },
  {
    slug: 'commercial-4-seater-and-7-seater-driver-economics',
    title: 'Commercial Driver Economics: 4-Seater Sedans vs 7-Seater MUVs in Hyderabad',
    category: 'Driver Welfare & Earnings',
    date: '2026-10-10T00:00:00.000Z',
    author: 'AdhocX Driver Community Desk',
    summary: 'An operational breakdown of fuel efficiency, daily run tariffs, and how the Century Milestone bonus maximizes monthly net driver payouts.'
  },
  {
    slug: '1-hour-bank-refund-sla-in-corporate-mobility',
    title: 'The 1-Hour Bank Refund SLA: Establishing Financial Recourse in B2B Fleet Transit',
    category: 'Compliance & Financial SLAs',
    date: '2026-09-28T00:00:00.000Z',
    author: 'AdhocX Legal & Finance Desk',
    summary: 'Why enterprise transport desks cannot afford locked balances in consumer cab wallets, and how instant IMPS/UPI refund rails transform corporate travel procurement.'
  },
  {
    slug: 'hyderabad-tech-park-employee-transit-compliance',
    title: 'Hyderabad Tech Park Transit Compliance: Yellow-Plate Regulations in HITEC City & Gachibowli',
    category: 'Regulatory Compliance',
    date: '2026-09-18T00:00:00.000Z',
    author: 'AdhocX Regulatory Affairs',
    summary: 'Key legal obligations under the Telangana Motor Vehicles Act regarding commercial fitness, passenger insurance, and police verification for corporate staff transport.'
  }
];

export const GET: APIRoute = async () => {
  let articles = [...SEED_ARTICLES];

  try {
    const apiUrl =
      process.env.API_URL ||
      process.env.PUBLIC_API_URL ||
      'http://localhost:7001/api/v1';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${apiUrl}/blogs?status=PUBLISHED&limit=20`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
        ? json
        : [];

      if (rawList.length > 0) {
        const fetched = rawList.map((p: any) => ({
          slug: p.slug,
          title: p.title,
          summary: p.excerpt || p.summary || p.title,
          date: p.publishedAt ? new Date(p.publishedAt).toISOString() : new Date().toISOString(),
          author: p.authorName || 'AdhocX Editorial Team',
          category: p.category || 'B2B Mobility',
        }));
        articles = [...fetched, ...SEED_ARTICLES.filter(s => !fetched.some(f => f.slug === s.slug))];
      }
    }
  } catch (_) {
    // Graceful fallback to SEED_ARTICLES
  }

  const itemsXml = articles
    .map(
      (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>https://www.adhocx.com/blogs/${item.slug}</link>
      <guid isPermaLink="true">https://www.adhocx.com/blogs/${item.slug}</guid>
      <description><![CDATA[${item.summary}]]></description>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <author><![CDATA[${item.author}]]></author>
      <category><![CDATA[${item.category}]]></category>
    </item>`
    )
    .join('');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AdhocX — B2B Commercial Mobility & Fleet Insights</title>
    <link>https://www.adhocx.com/blogs</link>
    <description>Authoritative research, operational case studies, and compliance guidelines for corporate employee transport, commercial 4-seater and 7-seater cabs in Hyderabad.</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://www.adhocx.com/rss.xml" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(rssFeed, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
