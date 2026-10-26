'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Plus,
  X,
  ExternalLink,
  Search,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { adminApi } from '@/lib/api/client';
import { BlogPostItem, CreateBlogPostInput, BlogMetrics } from '@/lib/api/types';
import {
  PageHeader,
  MetricCard,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
} from '../../components/common';

const CATEGORIES = [
  'B2B Fleet Operations',
  'Driver Welfare & Earnings',
  'Enterprise Logistics',
  'Technology & Dispatch',
  'Industry Insights',
  'Safety & Compliance',
];

const PRESET_COVERS = [
  { label: 'Fleet / Sedans', url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Driver / Mobility', url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Logistics / Warehouse', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80' },
  { label: 'City Transit / Night', url: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Airport / Highway', url: 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=1200&q=80' },
];

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<BlogPostItem[]>([]);
  const [metrics, setMetrics] = useState<BlogMetrics>({ total: 0, published: 0, drafts: 0, totalViews: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal / Drawer state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPostItem | null>(null);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateBlogPostInput>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: CATEGORIES[0],
    tags: ['Fleet Optimization', 'Hyderabad Cab Service'],
    coverImage: PRESET_COVERS[0].url,
    authorName: 'AdhocX Team',
    authorRole: 'Fleet Operations Research',
    status: 'PUBLISHED',
    readTime: '5 min read',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
  });

  const [tagInput, setTagInput] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [blogsRes, metricsRes] = await Promise.allSettled([
        adminApi.getBlogs(),
        adminApi.getBlogMetrics(),
      ]);

      if (blogsRes.status === 'fulfilled' && blogsRes.value?.items) {
        setBlogs(blogsRes.value.items);
      }
      if (metricsRes.status === 'fulfilled' && metricsRes.value) {
        setMetrics(metricsRes.value);
      }
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingBlog(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: `## Introduction\n\nExplain the context, key industry challenge, and why commercial fleet operations in Hyderabad require modernization.\n\n---\n\n## Core Strategic Insights\n\n1. **First Advantage:** Direct reverse auction matching eliminates middleman broker markups.\n2. **Second Advantage:** Instant 1-hour driver bank payouts improve retention and route punctuality.\n\n\`\`\`\n[Enterprise Request] --> [AdhocX Verified Pool] --> [1-Hour Settlement]\n\`\`\`\n\n---\n\n## Conclusion & Action Items\n\nContact the AdhocX team to benchmark your corporate mobility fleet.`,
      category: CATEGORIES[0],
      tags: ['Corporate Mobility', 'Fleet Management', 'Hyderabad Transit'],
      coverImage: PRESET_COVERS[0].url,
      authorName: 'AdhocX Team',
      authorRole: 'Fleet Operations Research',
      status: 'PUBLISHED',
      readTime: '4 min read',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: 'B2B cab service, hyderabad employee transport, fleet optimization',
    });
    setTagInput('');
    setEditorTab('write');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (blog: BlogPostItem) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      category: blog.category,
      tags: blog.tags || [],
      coverImage: blog.coverImage || PRESET_COVERS[0].url,
      authorName: blog.authorName,
      authorRole: blog.authorRole || '',
      status: blog.status,
      readTime: blog.readTime,
      seoTitle: blog.seoTitle || blog.title,
      seoDescription: blog.seoDescription || blog.excerpt,
      seoKeywords: blog.seoKeywords || '',
    });
    setTagInput('');
    setEditorTab('write');
    setIsModalOpen(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: prev.slug && editingBlog ? prev.slug : generatedSlug,
      seoTitle: prev.seoTitle === prev.title ? val : prev.seoTitle || val,
    }));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const newTags = Array.from(new Set([...(formData.tags || []), tagInput.trim()]));
    setFormData((prev) => ({ ...prev, tags: newTags }));
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((item) => item !== t),
    }));
  };

  const insertMarkdownSnippet = (prefix: string, suffix = '') => {
    const textarea = document.getElementById('blog-content-area') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || 'Sample Text';
    const replacement = `${prefix}${selected}${suffix}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    setFormData((prev) => ({ ...prev, content: newText }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showNotification('error', 'Title and content are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBlog) {
        const updated = await adminApi.updateBlog(editingBlog.id, formData);
        setBlogs((prev) => prev.map((b) => (b.id === editingBlog.id ? updated : b)));
        showNotification('success', `Blog "${updated.title}" updated successfully!`);
      } else {
        const created = await adminApi.createBlog(formData);
        setBlogs((prev) => [created, ...prev]);
        setMetrics((prev) => ({
          ...prev,
          total: prev.total + 1,
          published: created.status === 'PUBLISHED' ? prev.published + 1 : prev.published,
          drafts: created.status === 'DRAFT' ? prev.drafts + 1 : prev.drafts,
        }));
        showNotification('success', `Blog "${created.title}" published successfully!`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save blog post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (blog: BlogPostItem) => {
    const newStatus = blog.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const updated = await adminApi.updateBlog(blog.id, { status: newStatus });
      setBlogs((prev) => prev.map((b) => (b.id === blog.id ? updated : b)));
      setMetrics((prev) => ({
        ...prev,
        published: newStatus === 'PUBLISHED' ? prev.published + 1 : prev.published - 1,
        drafts: newStatus === 'DRAFT' ? prev.drafts + 1 : prev.drafts - 1,
      }));
      showNotification('success', `Post status changed to ${newStatus}`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to toggle status.');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await adminApi.deleteBlog(id);
      setBlogs((prev) => prev.filter((b) => b.id !== id));
      showNotification('success', 'Article deleted successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete article.');
    }
  };

  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      const matchesSearch =
        !searchQuery ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || b.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [blogs, searchQuery, statusFilter, categoryFilter]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: notification.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Blog Posts & Marketing Content Hub"
        subtitle="Create, manage, and optimize high-ranking articles for the AdhocX Marketing Hub & Search Engine visibility"
        liveStatus="Content Engine Active"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button variant="secondary" size="md" onClick={loadData} leftIcon={<RefreshCw size={15} />}>
              Refresh
            </Button>
            <Button variant="primary" size="md" onClick={handleOpenCreate} leftIcon={<Plus size={15} />}>
              Create New Article
            </Button>
          </div>
        }
      />

      {/* KPI Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <MetricCard
          label="Total Articles"
          value={metrics.total}
          subtext="Indexed editorial records"
          icon={<FileText size={18} color="var(--brand-primary)" />}
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Published & Indexed"
          value={metrics.published}
          subtext="Live on marketing web"
          icon={<CheckCircle2 size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Drafts & Revisions"
          value={metrics.drafts}
          subtext="Pending publication"
          icon={<Clock size={18} color="var(--color-warning)" />}
          accentColor="var(--color-warning)"
        />
        <MetricCard
          label="Total Lifetime Reads"
          value={metrics.totalViews.toLocaleString()}
          subtext="Organic reader impressions"
          icon={<Eye size={18} color="#0ea5e9" />}
          accentColor="#0ea5e9"
        />
      </div>

      {/* Filter and Search Bar */}
      <FilterBar
        tabs={[
          { id: 'ALL', label: 'All Articles', count: blogs.length },
          { id: 'PUBLISHED', label: 'Published', count: blogs.filter((b) => b.status === 'PUBLISHED').length },
          { id: 'DRAFT', label: 'Drafts', count: blogs.filter((b) => b.status === 'DRAFT').length },
        ]}
        activeTab={statusFilter}
        onTabChange={(t) => setStatusFilter(t as any)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by title, keywords, tags, slug..."
        extraFilters={
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '0.4375rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
            }}
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        }
      />

      {/* Articles DataTable */}
      <DataTable
        columns={[
          {
            header: 'ARTICLE DETAILS',
            accessor: (blog) => (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {blog.coverImage && (
                  <img
                    src={blog.coverImage}
                    alt={blog.title}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-md)',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.3 }}>
                    {blog.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                    /{blog.slug}
                  </div>
                </div>
              </div>
            ),
          },
          {
            header: 'CATEGORY',
            accessor: (blog) => (
              <span
                style={{
                  background: 'rgba(91, 66, 243, 0.12)',
                  color: 'var(--brand-primary)',
                  border: '1px solid rgba(91, 66, 243, 0.25)',
                  padding: '0.25rem 0.625rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {blog.category}
              </span>
            ),
          },
          {
            header: 'STATUS',
            accessor: (blog) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStatus(blog);
                }}
                title="Click to toggle publish status"
                style={{
                  background: blog.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: blog.status === 'PUBLISHED' ? 'var(--color-success)' : 'var(--color-warning)',
                  border: `1px solid ${blog.status === 'PUBLISHED' ? 'var(--color-success)' : 'var(--color-warning)'}`,
                  padding: '0.25rem 0.625rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: 'pointer',
                }}
              >
                {blog.status === 'PUBLISHED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {blog.status === 'PUBLISHED' ? 'Published' : 'Draft'}
              </button>
            ),
          },
          {
            header: 'READS',
            accessor: (blog) => (
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Eye size={12} /> {blog.views}
              </span>
            ),
          },
          {
            header: 'AUTHOR / READ TIME',
            accessor: (blog) => (
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>{blog.authorName}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{blog.readTime}</div>
              </div>
            ),
          },
          {
            header: 'PUBLISHED DATE',
            accessor: (blog) => (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {blog.publishedAt
                  ? new Date(blog.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Unpublished'}
              </span>
            ),
          },
          {
            header: 'ACTIONS',
            align: 'right',
            accessor: (blog) => (
              <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                <a
                  href={`http://localhost:4321/blogs/${blog.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Preview live on marketing site"
                  style={{
                    backgroundColor: 'var(--bg-card-elevated)',
                    color: 'var(--brand-primary)',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.375rem 0.625rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={12} /> Preview
                </a>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(blog);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(blog.id, blog.title);
                  }}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
        data={filteredBlogs}
        keyExtractor={(b) => b.id}
        loading={isLoading}
        emptyTitle="No blog articles found"
        emptySubtitle="No blog articles match your current search query or filter."
      />

      {/* ============================================================ */}
      {/* Create / Edit Article Modal / Drawer */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1e293b',
              }}
            >
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                  {editingBlog ? `Edit Article: ${editingBlog.title}` : 'Create New SEO Article'}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '2px 0 0 0' }}>
                  Write compelling B2B mobility insights and optimize for Google search rankings.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Left Column: Content, Title, Excerpt */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Title */}
                  <div>
                    <label style={{ display: 'block', color: '#e2e8f0', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                      Article Headline / Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. How Reverse Bidding Solves Corporate Cab Shortages in Hyderabad"
                      value={formData.title}
                      onChange={handleTitleChange}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: '#f8fafc',
                        fontSize: '15px',
                        fontWeight: '600',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                      URL Slug (Auto-generated)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0 12px' }}>
                      <span style={{ color: '#64748b', fontSize: '13px' }}>/blogs/</span>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          padding: '10px 6px',
                          color: '#38bdf8',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label style={{ display: 'block', color: '#e2e8f0', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                      Article Summary / Excerpt * (Used in Search Results & Previews)
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="A crisp 2-sentence summary outlining what the reader will learn..."
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: '#f8fafc',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Content Editor with Markdown Toolbar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
                        Article Body (Markdown Supported) *
                      </label>
                      <div style={{ display: 'flex', background: '#1e293b', borderRadius: '6px', padding: '2px' }}>
                        <button
                          type="button"
                          onClick={() => setEditorTab('write')}
                          style={{
                            background: editorTab === 'write' ? '#334155' : 'transparent',
                            color: editorTab === 'write' ? '#f8fafc' : '#94a3b8',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorTab('preview')}
                          style={{
                            background: editorTab === 'preview' ? '#334155' : 'transparent',
                            color: editorTab === 'preview' ? '#f8fafc' : '#94a3b8',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Preview
                        </button>
                      </div>
                    </div>

                    {/* Formatting Quick Toolbar */}
                    {editorTab === 'write' && (
                      <div
                        style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderBottom: 'none',
                          borderTopLeftRadius: '8px',
                          borderTopRightRadius: '8px',
                          padding: '6px 10px',
                          display: 'flex',
                          gap: '6px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {[
                          { label: 'H2', action: () => insertMarkdownSnippet('\n## ', '\n') },
                          { label: 'H3', action: () => insertMarkdownSnippet('\n### ', '\n') },
                          { label: 'Bold', action: () => insertMarkdownSnippet('**', '**') },
                          { label: 'Italic', action: () => insertMarkdownSnippet('*', '*') },
                          { label: 'List', action: () => insertMarkdownSnippet('\n- ', '') },
                          { label: 'Quote', action: () => insertMarkdownSnippet('\n> ', '\n') },
                          { label: 'Code', action: () => insertMarkdownSnippet('\n```\n', '\n```\n') },
                          { label: 'Divider', action: () => insertMarkdownSnippet('\n\n---\n\n') },
                        ].map((btn) => (
                          <button
                            key={btn.label}
                            type="button"
                            onClick={btn.action}
                            style={{
                              background: '#334155',
                              color: '#cbd5e1',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {editorTab === 'write' ? (
                      <textarea
                        id="blog-content-area"
                        required
                        rows={12}
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Write your article in structured markdown format..."
                        style={{
                          width: '100%',
                          background: '#090d16',
                          border: '1px solid #334155',
                          borderBottomLeftRadius: '8px',
                          borderBottomRightRadius: '8px',
                          padding: '14px',
                          color: '#e2e8f0',
                          fontSize: '14px',
                          fontFamily: 'ui-monospace, monospace',
                          lineHeight: '1.6',
                          outline: 'none',
                          resize: 'vertical',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          background: '#090d16',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          padding: '20px',
                          color: '#e2e8f0',
                          minHeight: '260px',
                          fontSize: '14px',
                          lineHeight: '1.7',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {formData.content || '(No content written yet)'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Taxonomy, Metadata & SERP Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Category Selector */}
                  <div>
                    <label style={{ display: 'block', color: '#e2e8f0', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        color: '#f8fafc',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Toggle */}
                  <div>
                    <label style={{ display: 'block', color: '#e2e8f0', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                      Publishing Status
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'PUBLISHED' })}
                        style={{
                          background: formData.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
                          border: `1px solid ${formData.status === 'PUBLISHED' ? '#10b981' : '#334155'}`,
                          color: formData.status === 'PUBLISHED' ? '#34d399' : '#94a3b8',
                          padding: '10px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <CheckCircle2 size={14} /> Published
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'DRAFT' })}
                        style={{
                          background: formData.status === 'DRAFT' ? 'rgba(245, 158, 11, 0.2)' : '#1e293b',
                          border: `1px solid ${formData.status === 'DRAFT' ? '#f59e0b' : '#334155'}`,
                          color: formData.status === 'DRAFT' ? '#fbbf24' : '#94a3b8',
                          padding: '10px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Clock size={14} /> Draft Only
                      </button>
                    </div>
                  </div>

                  {/* Author & Read Time */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Author Name</label>
                      <input
                        type="text"
                        value={formData.authorName}
                        onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          color: '#f8fafc',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Read Time</label>
                      <input
                        type="text"
                        value={formData.readTime}
                        onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                        placeholder="5 min read"
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          color: '#f8fafc',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Cover Image & Presets */}
                  <div>
                    <label style={{ display: 'block', color: '#e2e8f0', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                      Cover Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.coverImage || ''}
                      onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        color: '#f8fafc',
                        fontSize: '13px',
                        outline: 'none',
                        marginBottom: '8px',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {PRESET_COVERS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, coverImage: preset.url })}
                          style={{
                            background: formData.coverImage === preset.url ? '#0284c7' : '#1e293b',
                            color: formData.coverImage === preset.url ? '#fff' : '#94a3b8',
                            border: '1px solid #334155',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label style={{ display: 'block', color: '#e2e8f0', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                      Tags & Topics
                    </label>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        placeholder="Add tag (e.g. Rate Cards)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        style={{
                          flex: 1,
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          color: '#f8fafc',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        style={{
                          background: '#334155',
                          color: '#f8fafc',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        + Add
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(formData.tags || []).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#cbd5e1',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Google SERP Search Snippet Simulator */}
                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginTop: '8px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Search size={12} /> Google Search SERP Simulator
                    </div>
                    <div style={{ fontSize: '12px', color: '#10b981', fontFamily: 'sans-serif' }}>
                      https://adhocx.com › blogs › {formData.slug || 'article-url'}
                    </div>
                    <div style={{ fontSize: '15px', color: '#60a5fa', fontWeight: '600', marginTop: '2px', cursor: 'pointer' }}>
                      {formData.seoTitle || formData.title || 'Your Article Title'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div
                style={{
                  borderTop: '1px solid #1e293b',
                  marginTop: '24px',
                  paddingTop: '18px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Saving...' : editingBlog ? 'Update Article' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
