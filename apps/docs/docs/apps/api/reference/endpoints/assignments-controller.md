---
title: AssignmentsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for AssignmentsController.
status: partial
last_reviewed: "2026-11-23"
---

# AssignmentsController Endpoint Reference

**Stable controller ID:** `API-CTRL-ASSIGNMENTS`  
**Controller source:** `apps/api/src/modules/assignments/assignments.controller.ts:7`  
**Nest route prefix:** `assignments`  
**Swagger tags:** `Assignments`  
**Route methods:** 1; **decorated path variants:** 1

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/assignments`

**Handler:** `AssignmentsController.listAssignments` — `apps/api/src/modules/assignments/assignments.controller.ts:14`

**Purpose:** List driver requirement assignments

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.VENDOR, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query` `query: AdminAssignmentQueryDto` — [`AdminAssignmentQueryDto`](../request-response-dto-catalog.md#admin-assignment-query-dto)

**Success response declaration:**
- status `200` — type [`[AdminAssignmentListItemDto]`](../request-response-dto-catalog.md#admin-assignment-list-item-dto)

**Controller → service:**
- Calls `AssignmentsService.listAssignments` at `apps/api/src/modules/assignments/assignments.controller.ts:19`; implementation: `apps/api/src/modules/assignments/assignments.service.ts:62`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `assignment.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`AdminAssignmentQueryDto`](../request-response-dto-catalog.md#admin-assignment-query-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/assignments/assignments.controller.ts:14` — route decorator and handler.
- `apps/api/src/modules/assignments/assignments.service.ts:62` — directly invoked service method.
