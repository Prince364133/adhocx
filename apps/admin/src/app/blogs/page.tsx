"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Plus,
  ExternalLink,
  Search,
} from "lucide-react";
import { adminApi } from "@/lib/api/client";
import {
  BlogPostItem,
  CreateBlogPostInput,
  BlogMetrics,
} from "@/lib/api/types";
import {
  PageHeader,
  KpiStrip,
  FilterBar,
  DataTable,
  Button,
  Form,
  Drawer,
  ConfirmDialog,
  FeedbackBanner,
} from "../../components/common";

const CATEGORIES = [
  "B2B Fleet Operations",
  "Driver Welfare & Earnings",
  "Enterprise Logistics",
  "Technology & Dispatch",
  "Industry Insights",
  "Safety & Compliance",
];

const PRESET_COVERS = [
  {
    label: "Fleet Vehicles",
    url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Driver / Mobility",
    url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Logistics / Warehouse",
    url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "City Transit / Night",
    url: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Airport / Highway",
    url: "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=1200&q=80",
  },
];

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL?.trim().replace(/\/+$/, "") || "";

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<BlogPostItem[]>([]);
  const [metrics, setMetrics] = useState<BlogMetrics>({
    total: 0,
    published: 0,
    drafts: 0,
    totalViews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PUBLISHED" | "DRAFT"
  >("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modal / Drawer state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPostItem | null>(null);
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateBlogPostInput>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: CATEGORIES[0],
    tags: ["Fleet Optimization", "Hyderabad Cab Service"],
    coverImage: PRESET_COVERS[0].url,
    authorName: "AdhocX Team",
    authorRole: "Fleet Operations Research",
    status: "PUBLISHED",
    readTime: "5 min read",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
  });

  const [tagInput, setTagInput] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [blogsRes, metricsRes] = await Promise.allSettled([
        adminApi.getBlogs(),
        adminApi.getBlogMetrics(),
      ]);

      if (blogsRes.status === "fulfilled" && blogsRes.value?.items) {
        setBlogs(blogsRes.value.items);
      }
      if (metricsRes.status === "fulfilled" && metricsRes.value) {
        setMetrics(metricsRes.value);
      }
    } catch (err) {
      console.error("Failed to load blog posts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingBlog(null);
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: `## Introduction\n\nExplain the context, key industry challenge, and why commercial fleet operations in Hyderabad require modernization.\n\n---\n\n## Core Strategic Insights\n\n1. **First Advantage:** Direct reverse auction matching eliminates middleman broker markups.\n2. **Second Advantage:** Instant 1-hour driver bank payouts improve retention and route punctuality.\n\n\`\`\`\n[Enterprise Request] --> [AdhocX Verified Pool] --> [1-Hour Settlement]\n\`\`\`\n\n---\n\n## Conclusion & Action Items\n\nContact the AdhocX team to benchmark your corporate mobility fleet.`,
      category: CATEGORIES[0],
      tags: ["Corporate Mobility", "Fleet Management", "Hyderabad Transit"],
      coverImage: PRESET_COVERS[0].url,
      authorName: "AdhocX Team",
      authorRole: "Fleet Operations Research",
      status: "PUBLISHED",
      readTime: "4 min read",
      seoTitle: "",
      seoDescription: "",
      seoKeywords:
        "B2B cab service, hyderabad employee transport, fleet optimization",
    });
    setTagInput("");
    setEditorTab("write");
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
      authorRole: blog.authorRole || "",
      status: blog.status,
      readTime: blog.readTime,
      seoTitle: blog.seoTitle || blog.title,
      seoDescription: blog.seoDescription || blog.excerpt,
      seoKeywords: blog.seoKeywords || "",
    });
    setTagInput("");
    setEditorTab("write");
    setIsDirty(false);
    setIsModalOpen(true);
  };

  const updateFormData = (
    updater:
      | Partial<CreateBlogPostInput>
      | ((prev: CreateBlogPostInput) => CreateBlogPostInput),
  ) => {
    setIsDirty(true);
    setFormData((prev) =>
      typeof updater === "function" ? updater(prev) : { ...prev, ...updater },
    );
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
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    updateFormData((prev) => ({
      ...prev,
      title: val,
      slug: prev.slug && editingBlog ? prev.slug : generatedSlug,
      seoTitle: prev.seoTitle === prev.title ? val : prev.seoTitle || val,
    }));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const newTags = Array.from(
      new Set([...(formData.tags || []), tagInput.trim()]),
    );
    updateFormData((prev) => ({ ...prev, tags: newTags }));
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    updateFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((item) => item !== t),
    }));
  };

  const insertMarkdownSnippet = (prefix: string, suffix = "") => {
    const textarea = document.getElementById(
      "blog-content-area",
    ) as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || "Sample Text";
    const replacement = `${prefix}${selected}${suffix}`;
    const newText =
      text.substring(0, start) + replacement + text.substring(end);
    updateFormData((prev) => ({ ...prev, content: newText }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showNotification("error", "Title and content are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBlog) {
        const updated = await adminApi.updateBlog(editingBlog.id, formData);
        setBlogs((prev) =>
          prev.map((b) => (b.id === editingBlog.id ? updated : b)),
        );
        showNotification(
          "success",
          `Blog "${updated.title}" updated successfully!`,
        );
      } else {
        const created = await adminApi.createBlog(formData);
        setBlogs((prev) => [created, ...prev]);
        setMetrics((prev) => ({
          ...prev,
          total: prev.total + 1,
          published:
            created.status === "PUBLISHED"
              ? prev.published + 1
              : prev.published,
          drafts: created.status === "DRAFT" ? prev.drafts + 1 : prev.drafts,
        }));
        showNotification(
          "success",
          `Blog "${created.title}" published successfully!`,
        );
      }
      setIsDirty(false);
      setIsModalOpen(false);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save blog post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (blog: BlogPostItem) => {
    const newStatus = blog.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const updated = await adminApi.updateBlog(blog.id, { status: newStatus });
      setBlogs((prev) => prev.map((b) => (b.id === blog.id ? updated : b)));
      setMetrics((prev) => ({
        ...prev,
        published:
          newStatus === "PUBLISHED" ? prev.published + 1 : prev.published - 1,
        drafts: newStatus === "DRAFT" ? prev.drafts + 1 : prev.drafts - 1,
      }));
      showNotification("success", `Post status changed to ${newStatus}`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to toggle status.");
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
      showNotification(
        "success",
        `Article "${deleteTarget.title}" deleted successfully.`,
      );
      setDeleteTarget(null);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete article.");
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

      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      const matchesCategory =
        categoryFilter === "ALL" || b.category === categoryFilter;

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
          <div className="flex items-center" style={{ gap: "0.65rem" }}>
            <Button
              variant="secondary"
              size="md"
              onClick={loadData}
              leftIcon={<RefreshCw size={15} />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreate}
              leftIcon={<Plus size={15} />}
            >
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
            id: "total",
            label: "Total Articles",
            value: metrics.total,
            subtext: "Indexed editorial records",
            icon: <FileText size={16} color="var(--text-brand)" />,
            tone: "indigo",
          },
          {
            id: "published",
            label: "Published & Indexed",
            value: metrics.published,
            subtext: "Live on marketing web",
            icon: <CheckCircle2 size={16} color="var(--color-success)" />,
            tone: "success",
          },
          {
            id: "drafts",
            label: "Drafts & Revisions",
            value: metrics.drafts,
            subtext: "Pending publication",
            icon: <Clock size={16} color="var(--color-warning)" />,
            tone: "warning",
          },
          {
            id: "views",
            label: "Total Lifetime Reads",
            value: metrics.totalViews.toLocaleString(),
            subtext: "Organic reader impressions",
            icon: <Eye size={16} color="var(--color-info)" />,
            tone: "info",
          },
        ]}
      />

      {/* Filter and Search Bar */}
      <FilterBar
        tabs={[
          { id: "ALL", label: "All Articles", count: blogs.length },
          {
            id: "PUBLISHED",
            label: "Published",
            count: blogs.filter((b) => b.status === "PUBLISHED").length,
          },
          {
            id: "DRAFT",
            label: "Drafts",
            count: blogs.filter((b) => b.status === "DRAFT").length,
          },
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
            className="rounded-md bg-card border border-subtle text-primary text-control-lg"
            style={{ padding: "0.35rem 0.65rem" }}
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
            header: "ARTICLE DETAILS",
            accessor: (blog) => (
              <div className="flex gap-3 items-center">
                {blog.coverImage && (
                  <img
                    src={blog.coverImage}
                    alt={blog.title}
                    className="rounded-md object-cover flex-shrink-0"
                    style={{ width: "44px", height: "44px" }}
                  />
                )}
                <div>
                  <div
                    className="font-semibold text-primary text-body-sm"
                    style={{ lineHeight: 1.3 }}
                  >
                    {blog.title}
                  </div>
                  <div className="text-sm text-brand text-mono mt-compact">
                    /{blog.slug}
                  </div>
                </div>
              </div>
            ),
          },
          {
            header: "CATEGORY",
            accessor: (blog) => (
              <span
                className="text-brand rounded-sm text-sm font-semibold whitespace-nowrap"
                style={{
                  background: "rgba(var(--brand-accent-rgb), 0.12)",
                  border: "1px solid rgba(var(--brand-accent-rgb), 0.25)",
                  padding: "0.25rem 0.625rem",
                }}
              >
                {blog.category}
              </span>
            ),
          },
          {
            header: "STATUS",
            accessor: (blog) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStatus(blog);
                }}
                title="Click to toggle publish status"
                className="rounded-sm text-sm font-semibold inline-flex items-center cursor-pointer"
                style={{
                  background:
                    blog.status === "PUBLISHED"
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(245, 158, 11, 0.15)",
                  color:
                    blog.status === "PUBLISHED"
                      ? "var(--color-success)"
                      : "var(--color-warning)",
                  border: `1px solid ${blog.status === "PUBLISHED" ? "var(--color-success)" : "var(--color-warning)"}`,
                  padding: "0.25rem 0.625rem",
                  gap: "0.3rem",
                }}
              >
                {blog.status === "PUBLISHED" ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <Clock size={12} />
                )}
                {blog.status === "PUBLISHED" ? "Published" : "Draft"}
              </button>
            ),
          },
          {
            header: "READS",
            accessor: (blog) => (
              <span
                className="text-base text-secondary font-medium inline-flex items-center"
                style={{ gap: "0.3rem" }}
              >
                <Eye size={12} /> {blog.views}
              </span>
            ),
          },
          {
            header: "AUTHOR / READ TIME",
            accessor: (blog) => (
              <div>
                <div className="text-primary text-base font-medium">
                  {blog.authorName}
                </div>
                <div className="text-muted text-sm">{blog.readTime}</div>
              </div>
            ),
          },
          {
            header: "PUBLISHED DATE",
            accessor: (blog) => (
              <span className="text-muted text-sm">
                {blog.publishedAt
                  ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Unpublished"}
              </span>
            ),
          },
          {
            header: "ACTIONS",
            align: "right",
            accessor: (blog) => (
              <div className="flex justify-end" style={{ gap: "0.375rem" }}>
                {MARKETING_URL && (
                  <a
                    href={`${MARKETING_URL}/blogs/${blog.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Preview live on marketing site"
                    className="bg-card-elevated text-brand border border-subtle rounded-sm text-sm no-underline inline-flex items-center font-semibold"
                    style={{ padding: "0.375rem 0.625rem", gap: "0.3rem" }}
                  >
                    <ExternalLink size={12} /> Preview
                  </a>
                )}
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
        title={
          editingBlog
            ? `Edit Article: ${editingBlog.title}`
            : "Create New SEO Article"
        }
        subtitle="Write compelling B2B mobility insights and optimize for Google search rankings."
        closeOnBackdrop={!isSubmitting}
        footer={
          <div className="flex justify-between items-center w-full gap-3">
            <span className="text-sm text-muted">
              {isDirty ? "Unsaved edits in draft buffer" : "All changes synced"}
            </span>
            <div className="flex" style={{ gap: "0.65rem" }}>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleRequestCloseModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="blog-editor-form"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
              >
                {editingBlog ? "Update Article" : "Publish Article"}
              </Button>
            </div>
          </div>
        }
      >
        <Form id="blog-editor-form" onSubmit={handleSubmit}>
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
          >
            {/* Left Column: Content, Title, Excerpt */}
            <div className="flex flex-col gap-wide">
              {/* Title */}
              <div>
                <label className="form-label block mb-tight">
                  Article Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  className="form-input font-semibold"
                  placeholder="e.g. How Managed Direct Dispatch Solves Corporate Cab Shortages in Hyderabad"
                  value={formData.title}
                  onChange={handleTitleChange}
                />
              </div>

              {/* Slug */}
              <div>
                <label className="form-label block text-muted text-sm mb-tight">
                  URL Slug (Auto-generated)
                </label>
                <div className="flex items-center bg-surface-elevated border rounded-md py-0 px-3">
                  <span className="text-muted text-base">/blogs/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => updateFormData({ slug: e.target.value })}
                    className="w-full bg-transparent border-0 text-brand text-base text-mono"
                    style={{ padding: "0.55rem 0.4rem", outline: "none" }}
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className="form-label block mb-tight">
                  Article Summary / Excerpt * (Used in Search Results &amp;
                  Previews)
                </label>
                <textarea
                  required
                  rows={2}
                  className="form-textarea"
                  placeholder="A crisp 2-sentence summary outlining what the reader will learn..."
                  value={formData.excerpt}
                  onChange={(e) => updateFormData({ excerpt: e.target.value })}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Content Editor with Markdown Toolbar */}
              <div>
                <div className="flex justify-between items-center mb-snug">
                  <label className="form-label m-0">
                    Article Body (Markdown Supported) *
                  </label>
                  <div
                    className="inline-flex bg-surface-elevated border rounded-md"
                    style={{ padding: "2px", gap: "2px" }}
                  >
                    <button
                      type="button"
                      onClick={() => setEditorTab("write")}
                      className="border-0 text-sm font-semibold cursor-pointer"
                      style={{
                        background:
                          editorTab === "write"
                            ? "var(--brand-primary)"
                            : "transparent",
                        color:
                          editorTab === "write"
                            ? "#ffffff"
                            : "var(--text-secondary)",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "calc(var(--radius-md) - 2px)",
                      }}
                    >
                      Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab("preview")}
                      className="border-0 text-sm font-semibold cursor-pointer"
                      style={{
                        background:
                          editorTab === "preview"
                            ? "var(--brand-primary)"
                            : "transparent",
                        color:
                          editorTab === "preview"
                            ? "#ffffff"
                            : "var(--text-secondary)",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "calc(var(--radius-md) - 2px)",
                      }}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {/* Formatting Quick Toolbar */}
                {editorTab === "write" && (
                  <div
                    className="bg-surface-elevated border flex flex-wrap gap-tight"
                    style={{
                      borderBottom: "none",
                      borderTopLeftRadius: "var(--radius-md)",
                      borderTopRightRadius: "var(--radius-md)",
                      padding: "0.4rem 0.65rem",
                    }}
                  >
                    {[
                      {
                        label: "H2",
                        action: () => insertMarkdownSnippet("\n## ", "\n"),
                      },
                      {
                        label: "H3",
                        action: () => insertMarkdownSnippet("\n### ", "\n"),
                      },
                      {
                        label: "Bold",
                        action: () => insertMarkdownSnippet("**", "**"),
                      },
                      {
                        label: "Italic",
                        action: () => insertMarkdownSnippet("*", "*"),
                      },
                      {
                        label: "List",
                        action: () => insertMarkdownSnippet("\n- ", ""),
                      },
                      {
                        label: "Quote",
                        action: () => insertMarkdownSnippet("\n> ", "\n"),
                      },
                      {
                        label: "Code",
                        action: () =>
                          insertMarkdownSnippet("\n```\n", "\n```\n"),
                      },
                      {
                        label: "Divider",
                        action: () => insertMarkdownSnippet("\n\n---\n\n"),
                      },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={btn.action}
                        className="bg-surface text-secondary border rounded-sm text-xs font-semibold cursor-pointer"
                        style={{ padding: "0.2rem 0.5rem" }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}

                {editorTab === "write" ? (
                  <textarea
                    id="blog-content-area"
                    required
                    rows={12}
                    value={formData.content}
                    onChange={(e) =>
                      updateFormData({ content: e.target.value })
                    }
                    placeholder="Write your article in structured markdown format..."
                    className="w-full bg-base border text-primary text-md"
                    style={{
                      borderBottomLeftRadius: "var(--radius-md)",
                      borderBottomRightRadius: "var(--radius-md)",
                      padding: "0.85rem",
                      fontFamily: "ui-monospace, monospace",
                      lineHeight: 1.6,
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                ) : (
                  <div
                    className="bg-base border rounded-md p-4 text-primary text-md whitespace-pre-wrap"
                    style={{ minHeight: "260px", lineHeight: 1.7 }}
                  >
                    {formData.content || "(No content written yet)"}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Taxonomy, Metadata & SERP Preview */}
            <div className="flex flex-col gap-wide">
              {/* Category Selector */}
              <div>
                <label className="form-label block mb-tight">Category *</label>
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
                <label className="form-label block mb-tight">
                  Publishing Status
                </label>
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  <button
                    type="button"
                    onClick={() => updateFormData({ status: "PUBLISHED" })}
                    className="rounded-md font-semibold text-base cursor-pointer flex items-center justify-center gap-compact"
                    style={{
                      background:
                        formData.status === "PUBLISHED"
                          ? "rgba(16, 185, 129, 0.14)"
                          : "var(--bg-surface-elevated)",
                      border: `1px solid ${formData.status === "PUBLISHED" ? "var(--color-success)" : "var(--border)"}`,
                      color:
                        formData.status === "PUBLISHED"
                          ? "var(--color-success)"
                          : "var(--text-secondary)",
                      padding: "0.55rem 0.75rem",
                    }}
                  >
                    <CheckCircle2 size={14} /> Published
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData({ status: "DRAFT" })}
                    className="rounded-md font-semibold text-base cursor-pointer flex items-center justify-center gap-compact"
                    style={{
                      background:
                        formData.status === "DRAFT"
                          ? "rgba(245, 158, 11, 0.14)"
                          : "var(--bg-surface-elevated)",
                      border: `1px solid ${formData.status === "DRAFT" ? "var(--color-warning)" : "var(--border)"}`,
                      color:
                        formData.status === "DRAFT"
                          ? "var(--color-warning)"
                          : "var(--text-secondary)",
                      padding: "0.55rem 0.75rem",
                    }}
                  >
                    <Clock size={14} /> Draft Only
                  </button>
                </div>
              </div>

              {/* Author & Read Time */}
              <div
                className="grid"
                style={{ gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}
              >
                <div>
                  <label className="form-label block text-sm mb-1">
                    Author Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.authorName}
                    onChange={(e) =>
                      updateFormData({ authorName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="form-label block text-sm mb-1">
                    Read Time
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.readTime}
                    onChange={(e) =>
                      updateFormData({ readTime: e.target.value })
                    }
                    placeholder="5 min read"
                  />
                </div>
              </div>

              {/* Cover Image & Presets */}
              <div>
                <label className="form-label block mb-tight">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  className="form-input mb-2"
                  value={formData.coverImage || ""}
                  onChange={(e) =>
                    updateFormData({ coverImage: e.target.value })
                  }
                  placeholder="https://images.unsplash.com/..."
                />
                <div className="flex flex-wrap gap-tight">
                  {PRESET_COVERS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateFormData({ coverImage: preset.url })}
                      className="rounded-sm text-xs font-semibold cursor-pointer"
                      style={{
                        background:
                          formData.coverImage === preset.url
                            ? "var(--brand-primary)"
                            : "var(--bg-surface-elevated)",
                        color:
                          formData.coverImage === preset.url
                            ? "#ffffff"
                            : "var(--text-secondary)",
                        border: `1px solid ${formData.coverImage === preset.url ? "var(--border-focus)" : "var(--border)"}`,
                        padding: "0.2rem 0.5rem",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="form-label block mb-tight">
                  Tags &amp; Topics
                </label>
                <div className="flex mb-2 gap-compact">
                  <input
                    type="text"
                    className="form-input flex-1"
                    placeholder="Add tag (e.g. Rate Cards)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddTag}
                  >
                    + Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-compact">
                  {(formData.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="bg-surface-elevated border text-secondary text-sm inline-flex items-center"
                      style={{
                        padding: "0.15rem 0.5rem",
                        borderRadius: "9999px",
                        gap: "0.3rem",
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        aria-label={`Remove tag ${tag}`}
                        className="border-0 text-muted cursor-pointer text-base p-0"
                        style={{ background: "none", lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Google SERP Search Snippet Simulator */}
              <div
                className="bg-surface-elevated border rounded-md mt-1"
                style={{ padding: "0.85rem" }}
              >
                <div
                  className="text-muted text-xs font-bold uppercase flex items-center mb-snug gap-tight"
                  style={{ letterSpacing: "0.05em" }}
                >
                  <Search size={12} /> Google Search SERP Simulator
                </div>
                <div className="text-sm text-success">
                  https://adhocx.com › blogs › {formData.slug || "article-url"}
                </div>
                <div className="text-brand font-semibold text-value mt-snug">
                  {formData.seoTitle || formData.title || "Your Article Title"}
                </div>
                {formData.excerpt && (
                  <div
                    className="text-sm text-secondary mt-1 overflow-hidden"
                    style={{
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {formData.excerpt}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Form>
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
              Are you sure you want to delete{" "}
              <strong>&ldquo;{deleteTarget.title}&rdquo;</strong>? This will
              remove the article from the CMS and invalidate its public
              marketing URL.
            </span>
          ) : (
            ""
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
