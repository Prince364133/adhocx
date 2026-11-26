---
title: BlogsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for BlogsController.
status: partial
last_reviewed: "2026-11-23"
---

# BlogsController Endpoint Reference

**Stable controller ID:** `API-CTRL-BLOGS`  
**Controller source:** `apps/api/src/modules/blogs/blogs.controller.ts:24`  
**Nest route prefix:** `blogs`  
**Swagger tags:** `Blogs & Content Hub`  
**Route methods:** 4; **decorated path variants:** 4

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/blogs`

**Handler:** `BlogsController.listPublished` — `apps/api/src/modules/blogs/blogs.controller.ts:33`

**Purpose:** List published blog posts for marketing site with search & category filters

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Query` `query: QueryBlogDto` — [`QueryBlogDto`](../request-response-dto-catalog.md#query-blog-dto)

**Success response declaration:**
- status `200` — List of published articles with pagination

**Controller → service:**
- Calls `BlogsService.listPublishedBlogs` at `apps/api/src/modules/blogs/blogs.controller.ts:37`; implementation: `apps/api/src/modules/blogs/blogs.service.ts:58`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `blogPost.findMany`, `blogPost.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`QueryBlogDto`](../request-response-dto-catalog.md#query-blog-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/blogs/blogs.controller.ts:33` — route decorator and handler.
- `apps/api/src/modules/blogs/blogs.service.ts:58` — directly invoked service method.

## GET `/blogs/featured`

**Handler:** `BlogsController.getFeatured` — `apps/api/src/modules/blogs/blogs.controller.ts:40`

**Purpose:** Get current featured / trending blog article

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — Featured blog article

**Controller → service:**
- Calls `BlogsService.getFeaturedBlog` at `apps/api/src/modules/blogs/blogs.controller.ts:44`; implementation: `apps/api/src/modules/blogs/blogs.service.ts:161`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `blogPost.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/blogs/blogs.controller.ts:40` — route decorator and handler.
- `apps/api/src/modules/blogs/blogs.service.ts:161` — directly invoked service method.

## GET `/blogs/categories`

**Handler:** `BlogsController.getCategories` — `apps/api/src/modules/blogs/blogs.controller.ts:47`

**Purpose:** List all blog categories with article counts

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — Array of categories with counts

**Controller → service:**
- Calls `BlogsService.getCategoriesWithCount` at `apps/api/src/modules/blogs/blogs.controller.ts:51`; implementation: `apps/api/src/modules/blogs/blogs.service.ts:174`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `blogPost.groupBy`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/blogs/blogs.controller.ts:47` — route decorator and handler.
- `apps/api/src/modules/blogs/blogs.service.ts:174` — directly invoked service method.

## GET `/blogs/:slug`

**Handler:** `BlogsController.getBySlug` — `apps/api/src/modules/blogs/blogs.controller.ts:54`

**Purpose:** Get full article by SEO slug & increment view count

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Param(slug)` `slug: string`

**Success response declaration:**
- status `200` — Article data including rich content & SEO tags

**Controller → service:**
- Calls `BlogsService.getBlogBySlug` at `apps/api/src/modules/blogs/blogs.controller.ts:58`; implementation: `apps/api/src/modules/blogs/blogs.service.ts:133`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `blogPost.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/blogs/blogs.controller.ts:54` — route decorator and handler.
- `apps/api/src/modules/blogs/blogs.service.ts:133` — directly invoked service method.
