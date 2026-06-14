"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createGroup,
  updateGroup,
} from "@/app/(app)/app/groups/actions";
import {
  defaultMember,
  defaultPreferences,
  type FullGroupCreate,
} from "@/lib/schemas/group";
import type { MemberType, TravelStyle } from "@/types/domain";
import { MEMBER_TYPE_LABELS, TRAVEL_STYLE_LABELS } from "@/types/domain";

const ENVIRONMENT_OPTIONS = [
  { value: "mountain", label: "Góry" },
  { value: "beach", label: "Morze" },
  { value: "city", label: "Miasto" },
  { value: "countryside", label: "Wieś" },
  { value: "lake", label: "Jezioro" },
];

const ACCOMMODATION_OPTIONS = [
  { value: "hotel", label: "Hotel" },
  { value: "apartment", label: "Apartament" },
  { value: "villa", label: "Willa" },
  { value: "hostel", label: "Hostel" },
  { value: "camping", label: "Camping" },
];

const MEAL_OPTIONS = [
  { value: "RO", label: "Bez wyżywienia (RO)" },
  { value: "BB", label: "Śniadanie (BB)" },
  { value: "HB", label: "Półpensjonat (HB)" },
  { value: "AI", label: "All Inclusive (AI)" },
];

const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "Wegetariańska" },
  { value: "vegan", label: "Wegańska" },
  { value: "gluten_free", label: "Bezglutenowa" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Koszer" },
];

const EXCLUSION_OPTIONS = [
  { value: "no_all_inclusive", label: "Bez all inclusive" },
  { value: "no_large_hotels", label: "Bez dużych hoteli" },
  { value: "no_party_hotels", label: "Bez hoteli imprezowych" },
];

type GroupFormProps = {
  mode: "create" | "edit";
  groupId?: string;
  initialData?: FullGroupCreate;
};

function toggleArrayValue(arr: string[], value: string): string[] {
  return arr.includes(value)
    ? arr.filter((v) => v !== value)
    : [...arr, value];
}

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className="mb-4">
      <legend className="font-medium mb-2">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => onChange(toggleArrayValue(selected, opt.value))}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function GroupForm({ mode, groupId, initialData }: GroupFormProps) {
  const router = useRouter();
  const [groupName, setGroupName] = useState(initialData?.group.name ?? "");
  const [groupDescription, setGroupDescription] = useState(
    initialData?.group.description ?? "",
  );
  const [members, setMembers] = useState(
    initialData?.members ?? [{ ...defaultMember }],
  );
  const [preferences, setPreferences] = useState(
    initialData?.preferences ?? { ...defaultPreferences },
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function updateMember(
    index: number,
    field: keyof (typeof members)[0],
    value: string | number | null,
  ) {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  }

  function addMember() {
    setMembers((prev) => [...prev, { ...defaultMember }]);
  }

  function removeMember(index: number) {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors([]);

    const input: FullGroupCreate = {
      group: {
        name: groupName,
        description: groupDescription || null,
      },
      members: members.map((m) => ({
        name: m.name || null,
        member_type: m.member_type,
        age: m.age ?? null,
        notes: m.notes || null,
      })),
      preferences: {
        ...preferences,
        budget_total_pln: preferences.budget_total_pln || null,
        budget_per_person_pln: preferences.budget_per_person_pln || null,
        max_flight_duration_hours:
          preferences.max_flight_duration_hours || null,
        accessibility_needs: preferences.accessibility_needs || null,
        notes: preferences.notes || null,
      },
    };

    const result =
      mode === "create"
        ? await createGroup(input)
        : await updateGroup(groupId!, input);

    if (result && "error" in result) {
      setSubmitting(false);
      setError(result.error ?? "Nieznany błąd");
      if ("issues" in result && result.issues) {
        setFieldErrors(
          result.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        );
      }
      return;
    }

    if (mode === "edit") {
      router.push(`/app/groups/${groupId}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-3">Grupa</h2>
        <div className="space-y-3">
          <div>
            <label className="block mb-1">Nazwa *</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block mb-1">Opis</label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={2}
              className="border px-3 py-2 rounded w-full"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Członkowie</h2>
        {members.map((member, index) => (
          <div key={index} className="border p-4 rounded mb-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Członek {index + 1}</span>
              {members.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  className="text-red-600 text-sm underline"
                >
                  Usuń
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm">Imię</label>
                <input
                  type="text"
                  value={member.name ?? ""}
                  onChange={(e) =>
                    updateMember(index, "name", e.target.value || null)
                  }
                  className="border px-3 py-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm">Typ *</label>
                <select
                  value={member.member_type}
                  onChange={(e) =>
                    updateMember(
                      index,
                      "member_type",
                      e.target.value as MemberType,
                    )
                  }
                  className="border px-3 py-2 rounded w-full"
                >
                  {(
                    Object.entries(MEMBER_TYPE_LABELS) as [MemberType, string][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm">
                  Wiek {member.member_type === "child" ? "*" : ""}
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={member.age ?? ""}
                  onChange={(e) =>
                    updateMember(
                      index,
                      "age",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  required={member.member_type === "child"}
                  className="border px-3 py-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm">Notatki</label>
                <input
                  type="text"
                  value={member.notes ?? ""}
                  onChange={(e) =>
                    updateMember(index, "notes", e.target.value || null)
                  }
                  className="border px-3 py-2 rounded w-full"
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addMember}
          className="underline text-sm"
        >
          + Dodaj członka
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Preferencje</h2>
        <div className="space-y-3">
          <div>
            <label className="block mb-1">Styl wyjazdu</label>
            <select
              value={preferences.travel_style}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  travel_style: e.target.value as TravelStyle,
                }))
              }
              className="border px-3 py-2 rounded"
            >
              {(
                Object.entries(TRAVEL_STYLE_LABELS) as [TravelStyle, string][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <CheckboxGroup
            label="Środowisko"
            options={ENVIRONMENT_OPTIONS}
            selected={preferences.environment_preferences}
            onChange={(vals) =>
              setPreferences((p) => ({
                ...p,
                environment_preferences: vals,
              }))
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1">Budżet całkowity (PLN)</label>
              <input
                type="number"
                min={1}
                value={preferences.budget_total_pln ?? ""}
                onChange={(e) =>
                  setPreferences((p) => ({
                    ...p,
                    budget_total_pln: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
                className="border px-3 py-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Budżet na osobę (PLN)</label>
              <input
                type="number"
                min={1}
                value={preferences.budget_per_person_pln ?? ""}
                onChange={(e) =>
                  setPreferences((p) => ({
                    ...p,
                    budget_per_person_pln: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
                className="border px-3 py-2 rounded w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1">Max przesiadki</label>
              <input
                type="number"
                min={0}
                max={5}
                value={preferences.max_flight_stops}
                onChange={(e) =>
                  setPreferences((p) => ({
                    ...p,
                    max_flight_stops: Number(e.target.value),
                  }))
                }
                className="border px-3 py-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Max czas lotu (h)</label>
              <input
                type="number"
                min={1}
                value={preferences.max_flight_duration_hours ?? ""}
                onChange={(e) =>
                  setPreferences((p) => ({
                    ...p,
                    max_flight_duration_hours: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
                className="border px-3 py-2 rounded w-full"
              />
            </div>
          </div>

          <CheckboxGroup
            label="Zakwaterowanie"
            options={ACCOMMODATION_OPTIONS}
            selected={preferences.accommodation_types}
            onChange={(vals) =>
              setPreferences((p) => ({ ...p, accommodation_types: vals }))
            }
          />

          <CheckboxGroup
            label="Wyżywienie"
            options={MEAL_OPTIONS}
            selected={preferences.meal_plan_preferences}
            onChange={(vals) =>
              setPreferences((p) => ({ ...p, meal_plan_preferences: vals }))
            }
          />

          <CheckboxGroup
            label="Dieta"
            options={DIETARY_OPTIONS}
            selected={preferences.dietary_restrictions}
            onChange={(vals) =>
              setPreferences((p) => ({ ...p, dietary_restrictions: vals }))
            }
          />

          <CheckboxGroup
            label="Wykluczenia"
            options={EXCLUSION_OPTIONS}
            selected={preferences.exclusions}
            onChange={(vals) =>
              setPreferences((p) => ({ ...p, exclusions: vals }))
            }
          />

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferences.polish_speaking_guide_required}
                onChange={(e) =>
                  setPreferences((p) => ({
                    ...p,
                    polish_speaking_guide_required: e.target.checked,
                  }))
                }
              />
              Wymagany polskojęzyczny przewodnik
            </label>
          </div>

          <div>
            <label className="block mb-1">Potrzeby dostępności</label>
            <textarea
              value={preferences.accessibility_needs ?? ""}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  accessibility_needs: e.target.value || null,
                }))
              }
              rows={2}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block mb-1">Notatki</label>
            <textarea
              value={preferences.notes ?? ""}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  notes: e.target.value || null,
                }))
              }
              rows={2}
              className="border px-3 py-2 rounded w-full"
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="text-red-600">
          <p>Błąd: {error}</p>
          {fieldErrors.length > 0 && (
            <ul className="list-disc ml-5 mt-1">
              {fieldErrors.map((fe) => (
                <li key={fe}>{fe}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="border px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {submitting ? "Zapisuję..." : mode === "create" ? "Utwórz grupę" : "Zapisz zmiany"}
        </button>
        <a href={mode === "edit" ? `/app/groups/${groupId}` : "/app/groups"} className="underline py-2">
          Anuluj
        </a>
      </div>
    </form>
  );
}
