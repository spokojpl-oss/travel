import { z } from "zod";

export const memberTypeSchema = z.enum(["adult", "child", "infant", "senior"]);
export const travelStyleSchema = z.enum(["active", "relax", "mixed"]);

export const groupMemberSchema = z
  .object({
    name: z.string().optional().nullable(),
    member_type: memberTypeSchema,
    age: z.number().int().min(0).max(120).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) =>
      data.member_type !== "child" ||
      (data.age !== null && data.age !== undefined),
    { message: "Wiek jest wymagany dla dziecka", path: ["age"] },
  );

export const travelGroupSchema = z.object({
  name: z.string().min(1, "Nazwa grupy wymagana").max(100),
  description: z.string().max(500).optional().nullable(),
});

export const groupPreferencesSchema = z.object({
  travel_style: travelStyleSchema,
  environment_preferences: z.array(z.string()).default([]),
  budget_total_pln: z.number().int().positive().optional().nullable(),
  budget_per_person_pln: z.number().int().positive().optional().nullable(),
  max_flight_stops: z.number().int().min(0).max(5).default(2),
  max_flight_duration_hours: z.number().int().positive().optional().nullable(),
  accommodation_types: z.array(z.string()).default([]),
  meal_plan_preferences: z.array(z.string()).default([]),
  dietary_restrictions: z.array(z.string()).default([]),
  accessibility_needs: z.string().max(500).optional().nullable(),
  exclusions: z.array(z.string()).default([]),
  polish_speaking_guide_required: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable(),
});

export const fullGroupCreateSchema = z.object({
  group: travelGroupSchema,
  members: z
    .array(groupMemberSchema)
    .min(1, "Grupa musi mieć co najmniej 1 członka"),
  preferences: groupPreferencesSchema,
});

export type FullGroupCreate = z.infer<typeof fullGroupCreateSchema>;

export const profileUpdateSchema = z.object({
  display_name: z.string().min(1, "Imię wymagane").max(100),
  default_group_id: z.string().uuid().optional().nullable(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export const defaultPreferences: z.infer<typeof groupPreferencesSchema> = {
  travel_style: "mixed",
  environment_preferences: [],
  budget_total_pln: null,
  budget_per_person_pln: null,
  max_flight_stops: 2,
  max_flight_duration_hours: null,
  accommodation_types: [],
  meal_plan_preferences: [],
  dietary_restrictions: [],
  accessibility_needs: null,
  exclusions: [],
  polish_speaking_guide_required: false,
  notes: null,
};

export const defaultMember: z.infer<typeof groupMemberSchema> = {
  name: null,
  member_type: "adult",
  age: null,
  notes: null,
};
