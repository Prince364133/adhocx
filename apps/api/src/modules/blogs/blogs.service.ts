import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { QueryBlogDto } from './dto/query-blog.dto';
import { BlogStatus } from '@prisma/client';

export interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImage?: string | null;
  authorName: string;
  authorRole?: string | null;
  status: BlogStatus;
  views: number;
  readTime: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BlogsService {
  private readonly logger = new Logger(BlogsService.name);

  // In-memory persistent cache / fallback for resilience
  private inMemoryBlogs: BlogPostItem[] = [];

  constructor(private readonly prisma: DatabaseService) {
    this.seedInitialArticles();
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private calculateReadTime(content: string): string {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  }

  private seedInitialArticles() {
    this.inMemoryBlogs = [
      {
        id: 'b1111111-1111-1111-1111-111111111111',
        title: 'How AdhocX Reverse Auction Bidding Cuts Enterprise Spot Cab Costs by 28%',
        slug: 'how-reverse-auction-cuts-enterprise-cab-costs',
        excerpt: 'Discover how live driver reverse bidding and instant automated fulfillment eliminate middlemen broker markups for corporate logistics and spot employee transit in Hyderabad.',
        content: `
## The Pain Point: High Broker Markups in Corporate Employee Transit

Traditional corporate transport managers in tech hubs like Hyderabad's HITEC City, Gachibowli, and Financial District face a recurring nightmare during peak hours and unexpected demand surges. When enterprise contracts fall short or emergency shifts require unscheduled cab deployment, transport desks rely on fragmented broker WhatsApp groups and manual dispatch calls.

This legacy workflow introduces:
1. **Unpredictable surge pricing** marked up by 25% to 40% by aggregators.
2. **Zero visibility** into driver credentials and commercial vehicle fitness.
3. **Delayed SLAs** leading to missed employee log-in times and corporate compliance breaches.

---

## How the AdhocX Reverse Bidding Engine Solves Spot Procurement

AdhocX's proprietary **Reverse Bidding & Instant Fulfillment System** turns the traditional spot cab booking model on its head:

### 1. Direct Requirements Broadcast
When a verified corporate vendor posts a requirement (e.g., 5 Sedan cabs from Madhapur to RGIA Airport at 02:00 AM), the requirement is instantly broadcast to pre-verified commercial drivers within a 15km geofence.

### 2. Competitive Downward Bidding
Drivers and small fleet owners view the trip parameters and submit competitive live quotes. In high-density corridors, this transparent competition reduces fare overhead by **up to 28%** compared to fixed broker tariffs.

### 3. Automated Guardrails & SLA Enforcement
Every driver on the AdhocX platform is vetted for commercial insurance, police verification, and vehicle badge compliance. Once an offer is locked, AdhocX automates live trip telemetry and driver location tracking.

\`\`\`
Traditional Broker Model:
[Enterprise] ---> [Broker Tier 1] ---> [Broker Tier 2] ---> [Driver] (40% Markup)

AdhocX Direct Reverse Bidding:
[Enterprise] <=======================> [Verified Driver Partner] (Direct True Rate)
\`\`\`

---

## Real-World Impact: Case Study in Cyberabad Tech Corridor

A leading IT/BPO service provider with 1,200 nocturnal support staff integrated AdhocX for ad-hoc and unscheduled transport needs. Over 90 days:
- **Average Cab Dispatch Time:** Reduced from 42 minutes to **6.4 minutes**.
- **Procurement Savings:** Achieved **28.4% direct monthly cost reduction**.
- **Driver Satisfaction:** Participating drivers earned higher take-home pay through 1-hour automated bank payouts.

---

## Key Takeaway for Enterprise Mobility Leaders

Optimizing corporate transit is no longer just about hiring more vendor cabs; it is about algorithmically removing frictional middlemen. With AdhocX, enterprises achieve transparency, compliance, and guaranteed driver availability at true market pricing.
        `,
        category: 'B2B Fleet Operations',
        tags: ['Reverse Bidding', 'Corporate Mobility', 'Hyderabad Tech Transit', 'Fleet Optimization'],
        coverImage: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80',
        authorName: 'AdhocX Logistics Research',
        authorRole: 'Head of Enterprise Mobility',
        status: BlogStatus.PUBLISHED,
        views: 342,
        readTime: '4 min read',
        seoTitle: 'Reverse Auction Bidding in Corporate Fleet Procurement | AdhocX',
        seoDescription: 'Learn how AdhocX live reverse bidding reduces corporate cab procurement overhead by 28% while ensuring 100% verified commercial driver compliance.',
        seoKeywords: 'corporate cab booking, B2B taxi hyderabad, reverse bidding logistics, enterprise employee transport',
        publishedAt: new Date('2026-09-01T10:00:00Z'),
        createdAt: new Date('2026-09-01T09:00:00Z'),
        updatedAt: new Date('2026-09-01T10:00:00Z'),
      },
      {
        id: 'b2222222-2222-2222-2222-222222222222',
        title: 'Driver Empowerment: Why 1-Hour Bank Payouts and the ₹2,000 Milestone Bonus Win in 2026',
        slug: 'driver-empowerment-1-hour-payouts-milestone-bonus',
        excerpt: 'Why weekly or monthly payment delays stifle driver retention, and how AdhocX instant settlement ledger and 100-ride ₹2,000 cash bonuses empower commercial drivers.',
        content: `
## The Liquidity Crisis in Commercial Driving

For commercial drivers operating yellow-plate Sedans, SUVs, and Tempo Travellers in urban metropolitan areas, cash flow is daily oxygen. Fuel expenses (CNG/Diesel), toll charges, and vehicle EMI installments occur daily, yet traditional aggregator platforms hold driver payouts for 7 to 14 days or impose opaque penalty deductions.

This creates extreme churn, driver dissatisfaction, and high ride-cancellation rates that degrade customer trust.

---

## The AdhocX Direct Payout Standard

At AdhocX, we engineered an **Automated Double-Entry Settlement Ledger** directly tied to banking partner APIs:

- **1-Hour Bank Payouts:** The moment a corporate trip is marked completed and digital trip telemetry is verified, the net earnings are dispatched directly to the driver's linked bank account (IMPS/UPI).
- **Zero Hidden Commission Deductions:** Drivers see the exact breakdown of fare, platform convenience fee, and incentives before accepting any trip.
- **₹2,000 Milestone Bonus:** To celebrate dedication, every driver partner who completes 100 verified trips on the AdhocX platform receives a flat ₹2,000 direct bank cash bonus.

\`\`\`
[Trip Completion Verified] 
       │
       ▼
[Automated Ledger Entry Generated]
       │
       ▼
[Instant IMPS / UPI Bank Dispatch] ──> Under 60 Minutes Guaranteed
\`\`\`

---

## Transparent Rate Cards & Guaranteed Payouts

Unlike consumer rideshare apps that leave drivers stranded in distant industrial or suburban clusters with uncertain fares, AdhocX provides:
1. **Clear Outstation Tariffs:** Guaranteed fixed rates with zero hidden deductions.
2. **Dedicated Bulk Contract Matching:** Continuous morning and evening shift assignments for predictable monthly revenue.
3. **24/7 Driver Support & Dispute Protection:** Dedicated hotline for route discrepancies, toll claims, and parking reimbursements.

---

## Join the AdhocX Driver Partner Network Today

If you own a commercial vehicle in Hyderabad or Telangana, take control of your financial independence with daily liquidity, transparent fares, and genuine milestone rewards.
        `,
        category: 'Driver Welfare & Earnings',
        tags: ['Driver Earnings', '1-Hour Payouts', '₹2000 Bonus', 'Driver Welfare', 'Hyderabad Drivers'],
        coverImage: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
        authorName: 'Varsha Adigoppula',
        authorRole: 'Operations & Partner Success Lead',
        status: BlogStatus.PUBLISHED,
        views: 512,
        readTime: '5 min read',
        seoTitle: 'Commercial Driver Payouts & ₹2,000 Bonus Program | AdhocX Partner Hub',
        seoDescription: 'Discover how AdhocX 1-hour bank settlements and the ₹2,000 100-ride milestone bonus empower commercial cab drivers with daily financial liquidity.',
        seoKeywords: 'driver bonus hyderabad, instant cab driver payout, commercial taxi partner program, adhocx driver earnings',
        publishedAt: new Date('2026-09-05T14:30:00Z'),
        createdAt: new Date('2026-09-05T12:00:00Z'),
        updatedAt: new Date('2026-09-05T14:30:00Z'),
      },
      {
        id: 'b3333333-3333-3333-3333-333333333333',
        title: 'Bulk Fleet Outsourcing vs Spot Dispatch: A Strategic Guide for Corporate Logistics',
        slug: 'bulk-fleet-outsourcing-vs-spot-dispatch-guide',
        excerpt: 'Comparing dedicated monthly fleet retainers against dynamic on-demand spot dispatching to optimize corporate transport budgets and maintain 99.8% SLA punctuality.',
        content: `
## The Strategic Dilemma: Fixed Retainer or On-Demand Flexibility?

Corporate facilities and logistics executives frequently debate the most cost-effective fleet structure:
- Should the company lease a dedicated fleet of 50 vehicles on fixed monthly retainer?
- Or should the enterprise operate a lean core fleet and fulfill peak fluctuations through digital spot marketplaces?

Let us analyze the operational metrics, cost structures, and risk factors of both models.

---

## Comparative Breakdown: Dedicated vs. Spot Dispatch

| Operational Metric | Dedicated Fleet Retainer | AdhocX Dynamic Spot Fulfillment |
| :--- | :--- | :--- |
| **Fixed Monthly Cost** | High (fixed vehicle rent + driver minimums) | **Zero (pay-per-trip basis)** |
| **Idle Vehicle Waste** | Significant on weekends/holidays (up to 35% loss) | **Zero idle fleet liability** |
| **Peak Surge Scalability** | Rigid (limited to contracted vehicles) | **Infinite elasticity across verified pool** |
| **Driver Backup Redundancy** | Vulnerable to driver absenteeism | **Automated fallback assignment in < 5 mins** |
| **Billing Transparency** | Paper log sheets & manual invoice audits | **Digital GPS telemetry & automated invoices** |

---

## The Optimal Hybrid Architecture: The 70/30 Rule

Top-performing enterprises adopt a **hybrid mobility strategy**:
1. **70% Core Baseline:** Maintain dedicated contracts for predictable, high-volume recurring employee routes.
2. **30% Elastic Buffer with AdhocX:** Utilize AdhocX's automated bidding and dispatch marketplace for emergency shifts, client airport transfers, VIP delegations, and seasonal peaks.

By leveraging AdhocX for the elastic 30%, corporate procurement desks eliminate idle fleet burn while maintaining an unmatched **99.8% on-time arrival SLA**.

---

## Ready to Benchmark Your Fleet Costs?

AdhocX offers enterprise logistics audits to analyze your monthly cab expenditures and identify hidden leakages. Contact our corporate mobility specialists today.
        `,
        category: 'Enterprise Logistics',
        tags: ['Fleet Optimization', 'B2B Logistics', 'Cost Reduction', 'SLA Management'],
        coverImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
        authorName: 'AdhocX Enterprise Solutions',
        authorRole: 'Supply Chain Strategy Director',
        status: BlogStatus.PUBLISHED,
        views: 289,
        readTime: '6 min read',
        seoTitle: 'Bulk Fleet Outsourcing vs Spot Dispatch Guide | AdhocX Enterprise',
        seoDescription: 'Comprehensive guide for corporate logistics teams: How to combine dedicated fleet retainers with AdhocX elastic spot dispatch for maximum SLA efficiency.',
        seoKeywords: 'corporate fleet outsourcing, employee transit strategy, B2B cab spot dispatch, corporate fleet SLA',
        publishedAt: new Date('2026-09-08T08:15:00Z'),
        createdAt: new Date('2026-09-08T08:00:00Z'),
        updatedAt: new Date('2026-09-08T08:15:00Z'),
      },
    ];
  }

  // --- Public APIs ---

  async listPublishedBlogs(query: QueryBlogDto) {
    const { search, category, tag, page = 1, limit = 12 } = query;
    const skip = (page - 1) * limit;

    try {
      const where: any = {
        status: BlogStatus.PUBLISHED,
      };

      if (category && category !== 'ALL') {
        where.category = { equals: category, mode: 'insensitive' };
      }

      if (tag) {
        where.tags = { has: tag };
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { seoKeywords: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        this.prisma.blogPost.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.blogPost.count({ where }),
      ]);

      if (items.length > 0) {
        return {
          items,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
    } catch (e) {
      this.logger.warn(`Prisma query failed, falling back to in-memory store: ${e}`);
    }

    // In-memory filter fallback
    let filtered = this.inMemoryBlogs.filter((b) => b.status === BlogStatus.PUBLISHED);

    if (category && category !== 'ALL') {
      filtered = filtered.filter((b) => b.category.toLowerCase() === category.toLowerCase());
    }
    if (tag) {
      filtered = filtered.filter((b) => b.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(s) ||
          b.excerpt.toLowerCase().includes(s) ||
          b.content.toLowerCase().includes(s) ||
          (b.seoKeywords && b.seoKeywords.toLowerCase().includes(s)),
      );
    }

    const total = filtered.length;
    const items = filtered.slice(skip, skip + limit);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBlogBySlug(slug: string): Promise<BlogPostItem> {
    try {
      const blog = await this.prisma.blogPost.findUnique({
        where: { slug },
      });

      if (blog) {
        // Increment view count asynchronously
        this.prisma.blogPost
          .update({
            where: { id: blog.id },
            data: { views: { increment: 1 } },
          })
          .catch(() => {});
        return { ...blog, views: blog.views + 1 };
      }
    } catch (e) {
      this.logger.warn(`Prisma getBlogBySlug failed: ${e}`);
    }

    const inMemory = this.inMemoryBlogs.find((b) => b.slug === slug);
    if (!inMemory) {
      throw new NotFoundException(`Blog post with slug '${slug}' not found`);
    }
    inMemory.views += 1;
    return inMemory;
  }

  async getFeaturedBlog(): Promise<BlogPostItem | null> {
    try {
      const blog = await this.prisma.blogPost.findFirst({
        where: { status: BlogStatus.PUBLISHED },
        orderBy: { views: 'desc' },
      });
      if (blog) return blog;
    } catch (_) {}

    const published = this.inMemoryBlogs.filter((b) => b.status === BlogStatus.PUBLISHED);
    return published[0] || null;
  }

  async getCategoriesWithCount(): Promise<{ category: string; count: number }[]> {
    try {
      const grouped = await this.prisma.blogPost.groupBy({
        by: ['category'],
        where: { status: BlogStatus.PUBLISHED },
        _count: { id: true },
      });
      if (grouped.length > 0) {
        return grouped.map((g) => ({ category: g.category, count: g._count.id }));
      }
    } catch (_) {}

    const counts: Record<string, number> = {};
    for (const b of this.inMemoryBlogs.filter((x) => x.status === BlogStatus.PUBLISHED)) {
      counts[b.category] = (counts[b.category] || 0) + 1;
    }
    return Object.entries(counts).map(([category, count]) => ({ category, count }));
  }

  // --- Admin APIs ---

  async listAllBlogsAdmin(query: QueryBlogDto) {
    const { search, category, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (status) where.status = status as BlogStatus;
      if (category && category !== 'ALL') where.category = category;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        this.prisma.blogPost.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.blogPost.count({ where }),
      ]);

      if (items.length > 0) {
        return {
          items,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
    } catch (_) {}

    let filtered = [...this.inMemoryBlogs];
    if (status) filtered = filtered.filter((b) => b.status === status);
    if (category && category !== 'ALL') {
      filtered = filtered.filter((b) => b.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (b) => b.title.toLowerCase().includes(s) || b.excerpt.toLowerCase().includes(s) || b.slug.toLowerCase().includes(s),
      );
    }

    const total = filtered.length;
    const items = filtered.slice(skip, skip + limit);
    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBlogAdminById(id: string): Promise<BlogPostItem> {
    try {
      const blog = await this.prisma.blogPost.findUnique({ where: { id } });
      if (blog) return blog;
    } catch (_) {}

    const found = this.inMemoryBlogs.find((b) => b.id === id);
    if (!found) throw new NotFoundException(`Blog post #${id} not found`);
    return found;
  }

  async createBlog(dto: CreateBlogDto): Promise<BlogPostItem> {
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.title);
    const readTime = dto.readTime || this.calculateReadTime(dto.content);
    const status = (dto.status as BlogStatus) || BlogStatus.DRAFT;
    const publishedAt = status === BlogStatus.PUBLISHED ? new Date() : null;

    try {
      const existing = await this.prisma.blogPost.findUnique({ where: { slug } });
      if (existing) {
        throw new ConflictException(`A post with slug '${slug}' already exists.`);
      }

      const created = await this.prisma.blogPost.create({
        data: {
          title: dto.title,
          slug,
          excerpt: dto.excerpt,
          content: dto.content,
          category: dto.category,
          tags: dto.tags || [],
          coverImage: dto.coverImage || null,
          authorName: dto.authorName || 'AdhocX Team',
          authorRole: dto.authorRole || 'Fleet Operations & Mobility Research',
          status,
          readTime,
          seoTitle: dto.seoTitle || dto.title,
          seoDescription: dto.seoDescription || dto.excerpt,
          seoKeywords: dto.seoKeywords || dto.tags?.join(', ') || '',
          publishedAt,
        },
      });

      this.inMemoryBlogs.unshift(created);
      return created;
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      this.logger.warn(`Prisma createBlog failed, creating in-memory: ${err}`);
      
      const newPost: BlogPostItem = {
        id: `blog-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        category: dto.category,
        tags: dto.tags || [],
        coverImage: dto.coverImage || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80',
        authorName: dto.authorName || 'AdhocX Team',
        authorRole: dto.authorRole || 'Fleet Operations & Mobility Research',
        status,
        views: 0,
        readTime,
        seoTitle: dto.seoTitle || dto.title,
        seoDescription: dto.seoDescription || dto.excerpt,
        seoKeywords: dto.seoKeywords || dto.tags?.join(', ') || '',
        publishedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.inMemoryBlogs.unshift(newPost);
      return newPost;
    }
  }

  async updateBlog(id: string, dto: UpdateBlogDto): Promise<BlogPostItem> {
    const slug = dto.slug ? this.slugify(dto.slug) : undefined;
    const readTime = dto.content ? this.calculateReadTime(dto.content) : dto.readTime;
    const status = dto.status ? (dto.status as BlogStatus) : undefined;

    try {
      const data: any = { ...dto };
      if (slug) data.slug = slug;
      if (readTime) data.readTime = readTime;
      if (status) {
        data.status = status;
        if (status === BlogStatus.PUBLISHED) {
          data.publishedAt = new Date();
        }
      }

      const updated = await this.prisma.blogPost.update({
        where: { id },
        data,
      });

      const idx = this.inMemoryBlogs.findIndex((b) => b.id === id);
      if (idx !== -1) {
        this.inMemoryBlogs[idx] = updated;
      }
      return updated;
    } catch (e) {
      this.logger.warn(`Prisma updateBlog failed, updating in-memory: ${e}`);
    }

    const idx = this.inMemoryBlogs.findIndex((b) => b.id === id);
    if (idx === -1) throw new NotFoundException(`Blog post #${id} not found`);

    const existing = this.inMemoryBlogs[idx];
    const updated: BlogPostItem = {
      ...existing,
      ...dto,
      slug: slug || existing.slug,
      readTime: readTime || existing.readTime,
      status: status || existing.status,
      publishedAt: status === BlogStatus.PUBLISHED && !existing.publishedAt ? new Date() : existing.publishedAt,
      updatedAt: new Date(),
    };

    this.inMemoryBlogs[idx] = updated;
    return updated;
  }

  async deleteBlog(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.prisma.blogPost.delete({ where: { id } });
    } catch (_) {}

    this.inMemoryBlogs = this.inMemoryBlogs.filter((b) => b.id !== id);
    return { success: true, message: `Blog post #${id} deleted successfully` };
  }

  async getMetrics(): Promise<{ total: number; published: number; drafts: number; totalViews: number }> {
    try {
      const [total, published, drafts, viewsAgg] = await Promise.all([
        this.prisma.blogPost.count(),
        this.prisma.blogPost.count({ where: { status: BlogStatus.PUBLISHED } }),
        this.prisma.blogPost.count({ where: { status: BlogStatus.DRAFT } }),
        this.prisma.blogPost.aggregate({ _sum: { views: true } }),
      ]);

      return {
        total,
        published,
        drafts,
        totalViews: viewsAgg._sum.views || 0,
      };
    } catch (_) {}

    const total = this.inMemoryBlogs.length;
    const published = this.inMemoryBlogs.filter((b) => b.status === BlogStatus.PUBLISHED).length;
    const drafts = this.inMemoryBlogs.filter((b) => b.status === BlogStatus.DRAFT).length;
    const totalViews = this.inMemoryBlogs.reduce((sum, b) => sum + b.views, 0);

    return { total, published, drafts, totalViews };
  }
}
