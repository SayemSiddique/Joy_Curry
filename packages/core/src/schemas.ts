// Zod schemas for the API surface (ORCHESTRATOR §4).
//
// S7 (Phase M kickoff) introduces runtime contracts incrementally: the resources
// the mobile app needs first — menu, auth/user, orders — are defined here, and
// their TypeScript types are INFERRED from these schemas (single source of truth),
// replacing the hand-written interfaces that used to live in api.ts. Other
// resources (slots, distance, rewards, admin, favorites) keep their hand-written
// interfaces in api.ts for now and can migrate here later.
//
// These schemas describe the CLIENT-FACING (camelCase) shapes the API client
// returns — i.e. the Order schema matches the output of normalizeOrder(), not the
// raw snake_case wire payload. Validation runs only when an app opts in via
// initCore({ validateResponses: true }); see parseInDev below.

import { z } from 'zod';
import { shouldValidateResponses } from './config';

// ── Menu ──
export const ModifierSchema = z.object({
  id: z.string(),
  label: z.string(),
  priceDeltaCents: z.number(),
});

export const SizeOptionSchema = z.object({
  // The real menu data has no id on size options ({ label, priceCents }); the
  // pre-S7 interface wrongly declared id as required. Kept optional for any
  // future data that adds one.
  id: z.string().optional(),
  label: z.string(),
  priceCents: z.number(),
});

// Nullability below reflects the ACTUAL API payload, verified against all 145
// live menu items (S7): fields the backend sends as explicit null (not an absent
// key) use .nullish() (= .nullable().optional()); fields that are only ever a
// value or absent use .optional(). Using .optional() where the value is really
// null would false-warn on the majority of items; using .nullish() everywhere
// would over-widen types the web treats as `string | undefined` (e.g. imageUrl
// flows straight into CartItem.imageUrl).
export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  subcategory: z.string().nullish(), // null in 118/145
  description: z.string().optional(), // always present
  basePriceCents: z.number(),
  isVegan: z.boolean(),
  isVegetarian: z.boolean(),
  isGlutenFree: z.boolean(),
  isHalal: z.boolean(),
  spiceLevel: z.string().nullish(), // null in 61/145
  allergens: z.array(z.string()),
  modifiers: z.array(ModifierSchema),
  sizeOptions: z.array(SizeOptionSchema),
  tags: z.array(z.string()),
  imageUrl: z.string().optional(), // always present
  videoUrl: z.string().optional(), // always absent (reserved)
  inStock: z.boolean(),
  isActive: z.boolean(),
  servedWith: z.string().nullish(), // null in 85/145
  searchKeywords: z.array(z.string()).optional(), // always present
  pieceCount: z.number().nullish(), // null in 138/145
});

// ── Orders (normalized/camelCase — matches normalizeOrder output) ──
export const OrderLineItemSchema = z.object({
  id: z.number(),
  orderId: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  itemType: z.enum(['regular', 'bundle']),
  basePriceCents: z.number(),
  qty: z.number(),
  lineTotalCents: z.number(),
  // Persisted from the cart line's selectedOptions — an ARRAY of option objects
  // (not a record). Matches CartItem.selectedOptions.
  selectedOptions: z
    .array(z.object({ id: z.string(), label: z.string(), priceDeltaCents: z.number() }))
    .optional(),
  slotChoices: z.record(z.string(), z.unknown()).optional(),
});

export const OrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'ready',
  'completed',
  'cancelled',
]);

export const PaymentStatusSchema = z.enum(['unpaid', 'paid', 'failed', 'refunded']);

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.number(),
  deliveryType: z.enum(['delivery', 'pickup']),
  deliveryAddress: z.string().optional(),
  subtotalCents: z.number(),
  taxCents: z.number(),
  deliveryFeeCents: z.number(),
  totalCents: z.number(),
  status: OrderStatusSchema,
  paymentStatus: PaymentStatusSchema.optional(),
  estimatedWaitMin: z.number().optional(),
  notes: z.string().optional(),
  dropOffInstructions: z.string().optional(),
  createdAt: z.string(),
  lineItems: z.array(OrderLineItemSchema),
});

// ── User / auth ──
export const UserProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(),
  role: z.string(),
  dietaryPrefs: z.array(z.string()),
  addresses: z.array(z.string()),
  rewardsPoints: z.number(),
  rewardsLifetimeCents: z.number(),
});

// ── Inferred types (single source of truth; re-exported through index.ts) ──
export type Modifier = z.infer<typeof ModifierSchema>;
export type SizeOption = z.infer<typeof SizeOptionSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type OrderLineItem = z.infer<typeof OrderLineItemSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Validate `data` against `schema` ONLY when an app opted into response
 * validation via initCore({ validateResponses: true }). This is a dev/QA aid:
 * on failure it logs a structured warning; on success it stays quiet. Either
 * way it returns the ORIGINAL data unchanged and never throws.
 *
 * It is deliberately OBSERVATIONAL — it does not return zod's parsed output.
 * That matters because zod strips unknown keys by default: the API sends fields
 * not (yet) in the schema (e.g. allergenNote, proteinChoice on menu items), and
 * returning the parsed object would drop them in dev only, so dev and prod would
 * diverge. Returning the raw data guarantees identical shape in both; validation
 * only adds a console warning when the contract drifts. In production (flag off)
 * it is a single boolean check that returns immediately — zero parsing cost.
 */
export function parseInDev<T>(schema: z.ZodType<T>, data: T, label: string): T {
  if (!shouldValidateResponses()) return data;
  const result = schema.safeParse(data);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.warn(
      `[@joy-curry/core] response validation failed for "${label}":`,
      result.error.issues,
    );
  }
  return data;
}
