---
name: create-api-endpoint
description: Implement, validate, rate-limit, and document REST API routes in apps/server/src/routes/. Trigger words: route, endpoint, API, controller, Zod schema, Express, rate limit, request ID, /v1/.
---

## Overview

This skill guides the construction of secure, validated, and observable REST endpoints for the Lead Row backend.
**Governing Rules:** `05-api-and-validation.md`, `01-system-architecture.md`, `03-financial-and-payments.md`, and `PRD.md` Section 7.3.

---

## Ordered Procedure

1. **Define Request & Response Zod Schemas:**
   - Create or open `apps/server/src/schemas/[domain].schema.ts`.
   - Define strict Zod schemas for `params`, `query`, and `body` as needed.
   - For mutating endpoints (holds, checkout), apply `.strict()` to prevent parameter injection.
   - For monetary inputs, require positive integers (kobo). Never accept client-defined service fees or subtotals.

2. **Implement Business Logic in Service Layer:**
   - Create or open `apps/server/src/services/[domain].service.ts`.
   - Keep business logic decoupled from Express `req` and `res` objects.
   - If writing or reading critical state, invoke the repository with `writeClient` or `readClient`.
   - Never hold a database transaction open while awaiting external HTTP calls (TMDB, Flutterwave).

3. **Wire Express Route & Middleware:**
   - Create or open `apps/server/src/routes/[domain].routes.ts`.
   - Attach `requestIdMiddleware` to generate and echo `X-Request-Id`.
   - Attach rate-limiting middleware (`rateLimiterMiddleware`) configured with route-specific thresholds.
   - Attach authentication or authorization guards if route is user-owned or admin-protected.
   - Validate incoming payloads using a generic validation middleware `validateRequest({ params, query, body })`.

4. **Format Standardized Response Envelopes:**
   - Format success responses using `{ success: true, data: result, meta: { requestId, timestamp } }`.
   - Pass any uncaught domain exceptions to `next(err)`. Centralized error middleware formats `{ success: false, error: { code, message, requestId } }`.

5. **Register Route in Root Application:**
   - Register the router in `apps/server/src/app.ts` under `/v1/[domain]`.

---

## Code Skeleton

```typescript
// apps/server/src/schemas/hold.schema.ts
import { z } from 'zod';

export const CreateHoldParamsSchema = z.object({
  showtimeId: z.string().uuid(),
});

export const CreateHoldBodySchema = z.object({
  seatIds: z.array(z.string().uuid()).min(1).max(10),
  admissionToken: z.string().min(1),
}).strict();

export type CreateHoldParams = z.infer<typeof CreateHoldParamsSchema>;
export type CreateHoldBody = z.infer<typeof CreateHoldBodySchema>;
```

```typescript
// apps/server/src/routes/hold.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { validateRequest } from '../middleware/validateRequest';
import { rateLimiter } from '../middleware/rateLimiter';
import { authenticateUser } from '../middleware/auth';
import { CreateHoldParamsSchema, CreateHoldBodySchema } from '../schemas/hold.schema';
import { HoldService } from '../services/hold.service';

const router = Router();

router.post(
  '/showtimes/:showtimeId/holds',
  rateLimiter({ windowMs: 60000, max: 10, keyPrefix: 'rl:hold' }),
  authenticateUser,
  validateRequest({
    params: CreateHoldParamsSchema,
    body: CreateHoldBodySchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { showtimeId } = req.params;
      const { seatIds, admissionToken } = req.body;
      const userId = req.user!.id;
      const requestId = req.id;

      const holdResult = await HoldService.createHold({
        showtimeId,
        seatIds,
        userId,
        admissionToken,
        requestId,
      });

      return res.status(201).json({
        success: true,
        data: holdResult,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
```

---

## Common Traps

* **Accessing `req.body` Directly Without Zod:** Bypassing schema validation allows invalid arrays or extra fields to reach services.
* **Leaking Internal Stack Traces:** Catching an error and returning `res.status(500).json(error)` sends internal database strings to the client. Always pass to `next(err)`.
* **Missing `Retry-After` on 429/503:** Omitting the `Retry-After` response header when rate-limited or overloaded.
* **Client-Supplied Monetary Amounts:** Permitting the client to send ticket prices or service fees in request payloads.
* **Missing Request ID Propagation:** Forgetting to forward `req.id` into service and repository loggers.

---

## Verify Before Done

1. [ ] Check that `params`, `query`, and `body` schemas are fully defined and enforced with Zod.
2. [ ] Verify that `X-Request-Id` is generated and echoed in headers.
3. [ ] Verify that rate-limiting middleware is attached with specific limits.
4. [ ] Ensure response format matches `{ success: true, data: ..., meta: { requestId, timestamp } }`.
5. [ ] Verify that internal stack traces and Prisma errors are sanitized.
6. [ ] **Write Tests:** Add API tests in `apps/server/src/__tests__/[domain].api.test.ts` verifying:
   - Valid payload returns HTTP 200 or 201 with standard envelope
   - Invalid payload returns HTTP 400 with Zod error details
   - Missing authentication token returns HTTP 401
   - Exceeding rate limit returns HTTP 429 with `Retry-After` header

