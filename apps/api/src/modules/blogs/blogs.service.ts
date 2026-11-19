import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { QueryBlogDto } from './dto/query-blog.dto';
import { BlogStatus } from '@prisma/client';
import { sanitizeBlogHtml, sanitizeImageUrl } from './blog-html-sanitizer';

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

  constructor(private readonly prisma: DatabaseService) {}

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
          content: sanitizeBlogHtml(dto.content) ?? '',
          category: dto.category,
          tags: dto.tags || [],
          coverImage: sanitizeImageUrl(dto.coverImage),
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
      if (dto.content !== undefined) data.content = sanitizeBlogHtml(dto.content) ?? '';
      if (dto.coverImage !== undefined) data.coverImage = sanitizeImageUrl(dto.coverImage);
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
