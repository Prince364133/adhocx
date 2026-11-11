'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Plus,
  ExternalLink,
  Search,
} from 'lucide-react';
import { adminApi } from '@/lib/api/client';
import { BlogPostItem, CreateBlogPostInput, BlogMetrics } from '@/lib/api/types';
import {
  PageHeader,
  KpiStrip,
  FilterBar,
  DataTable,
  Button,
  Drawer,
  ConfirmDialog,
  FeedbackBanner,
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
  const [isDirty, setIsDirty] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
    setIsDirty(false);
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
    setIsDirty(false);
    setIsModalOpen(true);
  };

  const updateFormData = (
    updater: Partial<CreateBlogPostInput> | ((prev: CreateBlogPostInput) => CreateBlogPostInput)
  ) => {
    setIsDirty(true);
    setFormData((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
  };

  const handleRequestCloseModal = () => {
    if (isSubmitting) return;
    if (isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    setIsModalOpen(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    updateFormData((prev) => ({
      ...prev,
      title: val,
      slug: prev.slug && editingBlog ? prev.slug : generatedSlug,
      seoTitle: prev.seoTitle === prev.title ? val : prev.seoTitle || val,
    }));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const newTags = Array.from(new Set([...(formData.tags || []), tagInput.trim()]));
    updateFormData((prev) => ({ ...prev, tags: newTags }));
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    updateFormData((prev) => ({
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
    updateFormData((prev) => ({ ...prev, content: newText }));
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
      setIsDirty(false);
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

  const handleDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteBlog(deleteTarget.id);
      setBlogs((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      showNotification('success', `Article "${deleteTarget.title}" deleted successfully.`);
      setDeleteTarget(null);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete article.');
    } finally {
      setIsDeleting(false);
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
    <div className="admin-page">
      {/* Notification Toast */}
      {notification && (
        <FeedbackBanner
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Blog Posts & Marketing Content Hub"
        subtitle="Create, manage, and optimize high-ranking articles for the AdhocX Marketing Hub & Search Engine visibility"
        liveStatus="Content Engine Active"
        actions={
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
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
      <KpiStrip
        columns={4}
        items={[
          {
            id: 'total',
            label: 'Total Articles',
            value: metrics.total,
            subtext: 'Indexed editorial records',
            icon: <FileText size={16} color="var(--brand-primary)" />,
            tone: 'indigo',
          },
          {
            id: 'published',
            label: 'Published & Indexed',
            value: metrics.published,
            subtext: 'Live on marketing web',
            icon: <CheckCircle2 size={16} color="var(--color-success)" />,
            tone: 'success',
          },
          {
            id: 'drafts',
            label: 'Drafts & Revisions',
            value: metrics.drafts,
            subtext: 'Pending publication',
            icon: <Clock size={16} color="var(--color-warning)" />,
            tone: 'warning',
          },
          {
            id: 'views',
            label: 'Total Lifetime Reads',
            value: metrics.totalViews.toLocaleString(),
            subtext: 'Organic reader impressions',
            icon: <Eye size={16} color="var(--color-info)" />,
            tone: 'info',
          },
        ]}
      />

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
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.76rem',
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
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem', lineHeight: 1.3 }}>
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
      {/* Create / Edit Article Right-Side Drawer */}
      {/* ============================================================ */}
      <Drawer
        isOpen={isModalOpen}
        onClose={handleRequestCloseModal}
        width="min(96vw, 860px)"
        icon={<FileText size={18} />}
        title={editingBlog ? `Edit Article: ${editingBlog.title}` : 'Create New SEO Article'}
        subtitle="Write compelling B2B mobility insights and optimize for Google search rankings."
        closeOnBackdrop={!isSubmitting}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isDirty ? 'Unsaved edits in draft buffer' : 'All changes synced'}
            </span>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <Button type="button" variant="secondary" size="md" onClick={handleRequestCloseModal} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" form="blog-editor-form" variant="primary" size="md" isLoading={isSubmitting}>
                {editingBlog ? 'Update Article' : 'Publish Article'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="blog-editor-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Left Column: Content, Title, Excerpt */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              {/* Title */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Article Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. How Managed Direct Dispatch Solves Corporate Cab Shortages in Hyderabad"
                  value={formData.title}
                  onChange={handleTitleChange}
                  style={{ fontWeight: 600 }}
                />
              </div>

              {/* Slug */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  URL Slug (Auto-generated)
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 0.75rem',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>/blogs/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => updateFormData({ slug: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '0.55rem 0.4rem',
                      color: 'var(--brand-primary)',
                      fontSize: '0.8125rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Article Summary / Excerpt * (Used in Search Results &amp; Previews)
                </label>
                <textarea
                  required
                  rows={2}
                  className="form-textarea"
                  placeholder="A crisp 2-sentence summary outlining what the reader will learn..."
                  value={formData.excerpt}
                  onChange={(e) => updateFormData({ excerpt: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Content Editor with Markdown Toolbar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Article Body (Markdown Supported) *
                  </label>
                  <div
                    style={{
                      display: 'inline-flex',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '2px',
                      gap: '2px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setEditorTab('write')}
                      style={{
                        background: editorTab === 'write' ? 'var(--brand-primary)' : 'transparent',
                        color: editorTab === 'write' ? '#ffffff' : 'var(--text-secondary)',
                        border: 'none',
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'calc(var(--radius-md) - 2px)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      style={{
                        background: editorTab === 'preview' ? 'var(--brand-primary)' : 'transparent',
                        color: editorTab === 'preview' ? '#ffffff' : 'var(--text-secondary)',
                        border: 'none',
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'calc(var(--radius-md) - 2px)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
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
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border)',
                      borderBottom: 'none',
                      borderTopLeftRadius: 'var(--radius-md)',
                      borderTopRightRadius: 'var(--radius-md)',
                      padding: '0.4rem 0.65rem',
                      display: 'flex',
                      gap: '0.35rem',
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
                          background: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
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
                    onChange={(e) => updateFormData({ content: e.target.value })}
                    placeholder="Write your article in structured markdown format..."
                    style={{
                      width: '100%',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      borderBottomLeftRadius: 'var(--radius-md)',
                      borderBottomRightRadius: 'var(--radius-md)',
                      padding: '0.85rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      fontFamily: 'ui-monospace, monospace',
                      lineHeight: 1.6,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      color: 'var(--text-primary)',
                      minHeight: '260px',
                      fontSize: '0.875rem',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {formData.content || '(No content written yet)'}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Taxonomy, Metadata & SERP Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              {/* Category Selector */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Category *
                </label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => updateFormData({ category: e.target.value })}
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
                <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Publishing Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => updateFormData({ status: 'PUBLISHED' })}
                    style={{
                      background: formData.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.14)' : 'var(--bg-surface-elevated)',
                      border: `1px solid ${formData.status === 'PUBLISHED' ? 'var(--color-success)' : 'var(--border)'}`,
                      color: formData.status === 'PUBLISHED' ? 'var(--color-success)' : 'var(--text-secondary)',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
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
                    onClick={() => updateFormData({ status: 'DRAFT' })}
                    style={{
                      background: formData.status === 'DRAFT' ? 'rgba(245, 158, 11, 0.14)' : 'var(--bg-surface-elevated)',
                      border: `1px solid ${formData.status === 'DRAFT' ? 'var(--color-warning)' : 'var(--border)'}`,
                      color: formData.status === 'DRAFT' ? 'var(--color-warning)' : 'var(--text-secondary)',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    Author Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.authorName}
                    onChange={(e) => updateFormData({ authorName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    Read Time
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.readTime}
                    onChange={(e) => updateFormData({ readTime: e.target.value })}
                    placeholder="5 min read"
                  />
                </div>
              </div>

              {/* Cover Image & Presets */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Cover Image URL
                </label>
                <input
                  type="url"
                  className="form-input"
                  value={formData.coverImage || ''}
                  onChange={(e) => updateFormData({ coverImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  style={{ marginBottom: '0.5rem' }}
                />
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {PRESET_COVERS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateFormData({ coverImage: preset.url })}
                      style={{
                        background: formData.coverImage === preset.url ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                        color: formData.coverImage === preset.url ? '#ffffff' : 'var(--text-secondary)',
                        border: `1px solid ${formData.coverImage === preset.url ? 'var(--brand-primary)' : 'var(--border)'}`,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
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
                <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Tags &amp; Topics
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add tag (e.g. Rate Cards)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>
                    + Add
                  </Button>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {(formData.tags || []).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        aria-label={`Remove tag ${tag}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Google SERP Search Snippet Simulator */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  marginTop: '0.25rem',
                }}
              >
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.45rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Search size={12} /> Google Search SERP Simulator
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>
                  https://adhocx.com › blogs › {formData.slug || 'article-url'}
                </div>
                <div style={{ fontSize: '0.9375rem', color: 'var(--brand-primary)', fontWeight: 600, marginTop: '0.15rem' }}>
                  {formData.seoTitle || formData.title || 'Your Article Title'}
                </div>
                {formData.excerpt && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      marginTop: '0.25rem',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {formData.excerpt}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </Drawer>

      {/* Delete Article Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleExecuteDelete}
        variant="danger"
        isLoading={isDeleting}
        title="Delete Blog Article?"
        subtitle="Permanent removal from Marketing Hub"
        description={
          deleteTarget ? (
            <span>
              Are you sure you want to delete <strong>&ldquo;{deleteTarget.title}&rdquo;</strong>? This will remove the article from the CMS and invalidate its public marketing URL.
            </span>
          ) : (
            ''
          )
        }
        confirmLabel="Delete Article"
      />

      {/* Unsaved Changes Confirmation Dialog */}
      <ConfirmDialog
        isOpen={discardConfirmOpen}
        onClose={() => setDiscardConfirmOpen(false)}
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          setIsDirty(false);
          setIsModalOpen(false);
        }}
        variant="warning"
        title="Discard Unsaved Changes?"
        subtitle="Editorial draft buffer"
        description="You have unsaved edits in this article. Closing the editor drawer now will discard your changes."
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
      />
    </div>
  );
}
