---
title: AdminBlogsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for AdminBlogsController.
status: partial
last_reviewed: "2026-11-23"
---

# AdminBlogsController Endpoint Reference

**Stable controller ID:** `API-CTRL-ADMIN-BLOGS`  
**Controller source:** `apps/api/src/modules/blogs/blogs.controller.ts:62`  
**Nest route prefix:** `admin/blogs`  
**Swagger tags:** `Admin Blog Management`  
**Route methods:** 6; **decorated path variants:** 6

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/admin/blogs`

**Handler:** `AdminBlogsController.listAll` — `apps/api/src/modules/blogs/blogs.controller.ts:75`

**Purpose:** List all blog posts (published, drafts, archived) for Admin panel

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query` `query: QueryBlogDto` — [`QueryBlogDto`](../request-response-dto-catalog.md#query-blog-dto)

**Success response declaration:**
- status `200` — Paginated administrative list of blog posts

**Controller → service:**
- Calls `BlogsService.listAllBlogsAdmin` at `apps/api/src/modules/blogs/blogs.controller.ts:79`; implementation: `apps/api/src/modules/blogs/blogs.service.ts:195`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `blogPost.findMany`, `blogPost.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`QueryBlogDto`](../request-response-dto-catalog.md#query-blog-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/blogs/blogs.controller.ts:75` — route decorator and handler.
- `apps/api/src/modules/blogs/blogs.service.ts:195` — directly invoked service method.

## GET `/admin/blogs/metrics`

**Handler:** `AdminBlogsController.getMetrics` — `apps/api/src/modules/blogs/blogs.controller.ts:82`

**Purpose:** Get overall blog metrics (total, published, drafts, lifetime views)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — Blog metrics summary

**Controller → service:**
- Calls `BlogsService.getMetrics` at `apps/api/src/modules/blogs/blogs.controller.ts:86`; implementation: `apps/api/src/modules/blogs/blogs.service.ts:384`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `blogPost.count`, `blogPost.aggregate`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/blogs/blogs.controller.ts:82` — route decorator and handler.
- `apps/api/src/modules/blogs/blogs.service.ts:384` — directly invoked service method.

## GET `/admin/blogs/:id`

**Handler:** `AdminBlogsController.getById` — `apps/api/src/modules/blogs/blogs.controller.ts:89`

**Purpose:** Get a single blog post by UUID for editing

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- status `200` — Full blog post record

**Controller → service:**
- Calls `BlogsService.getBlogAdminById` at `apps/api/src/modules/blogs/blogs.controller.ts:93`; implementation: `apps/api/src/modules/blogs/blogs.service.ts:249`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `blogPost.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/blogs/blogs.controller.ts:89` — route decorator and handler.
- `apps/api/src/modules/blogs/blogs.service.ts:249` — directly invoked service method.

## POST `/admin/blogs`

**Handler:** `AdminBlogsController.create` — `apps/api/src/modules/blogs/blogs.controller.ts:96`

**Purpose:** Create a new blog post from Admin panel

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Body` `dto: CreateBlogDto` — [`CreateBlogDto`](../request-response-dto-catalog.md#create-blog-dto)

**Success response declaration:**
- status `201` — Blog post created successfully

**Controller → service:**
- Calls `BlogsService.createBlog` at `apps/api/src/modules/blogs/blogs.controller.ts:101`; implementation: `apps/api/src/modules/blogs/blogs.service.ts:260`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `blogPost.findUnique`, `blogPost.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateBlogDto`](../request-response-dto-catalog.md#create-blog-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/blogs/blogs.controller.ts:96` — route decorator and handler.
- `apps/api/src/modules/blogs/blogs.service.ts:260` — directly invoked service method.

## PATCH `/admin/blogs/:id`

**Handler:** `AdminBlogsController.update` — `apps/api/src/modules/blogs/blogs.controller.ts:104`

**Purpose:** Update an existing blog post or toggle status

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: UpdateBlogDto` — [`UpdateBlogDto`](../request-response-dto-catalog.md#update-blog-dto)

**Success response declaration:**
- status `200` — Blog post updated successfully

**Controller → service:**
- Calls `BlogsService.updateBlog` at `apps/api/src/modules/blogs/blogs.controller.ts:108`; implementation: `apps/api/src/modules/blogs/blogs.service.ts:325`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `blogPost.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateBlogDto`](../request-response-dto-catalog.md#update-blog-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/blogs/blogs.controller.ts:104` — route decorator and handler.
- `apps/api/src/modules/blogs/blogs.service.ts:325` — directly invoked service method.

## DELETE `/admin/blogs/:id`

**Handler:** `AdminBlogsController.delete` — `apps/api/src/modules/blogs/blogs.controller.ts:111`

**Purpose:** Delete a blog post

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- status `200` — Blog post deleted successfully

**Controller → service:**
- Calls `BlogsService.deleteBlog` at `apps/api/src/modules/blogs/blogs.controller.ts:115`; implementation: `apps/api/src/modules/blogs/blogs.service.ts:375`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `blogPost.delete`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/blogs/blogs.controller.ts:111` — route decorator and handler.
- `apps/api/src/modules/blogs/blogs.service.ts:375` — directly invoked service method.
