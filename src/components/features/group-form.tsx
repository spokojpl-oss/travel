"use client";

import Link from "next/link";
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
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

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

const fieldClass =
  "block w-full rounded-md border border-border-default bg-white px-3 py-2.5 text-base text-text-primary transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 focus-visible:outline-none";

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

function PillCheckboxGroup({
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
    <div>
      <p className="mb-2 text-sm font-medium text-text-primary">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(toggleArrayValue(selected, opt.value))}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-700 text-white"
                  : "bg-bg-soft text-text-secondary hover:bg-brand-50 hover:text-brand-700",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
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

  const cancelHref =
    mode === "edit" ? `/app/groups/${groupId}` : "/app/groups";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <Card>
        <CardHeader title="Grupa" />
        <CardBody className="space-y-4">
          <Input
            label="Nazwa *"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            placeholder="np. Rodzina Kowalskich"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Opis
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={2}
              placeholder="Opcjonalnie — kto to jest, jak podróżujecie"
              className={fieldClass}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Członkowie"
          action={
            <Button type="button" variant="ghost" size="sm" onClick={addMember}>
              <Icon name="plus" size={14} />
              Dodaj
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {members.map((member, index) => (
            <div
              key={index}
              className="rounded-xl border border-border-default bg-bg-soft/50 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display font-semibold text-text-primary">
                  Członek {index + 1}
                </span>
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="flex items-center gap-1 text-sm text-danger hover:underline"
                  >
                    <Icon name="x" size={14} />
                    Usuń
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Imię"
                  type="text"
                  value={member.name ?? ""}
                  onChange={(e) =>
                    updateMember(index, "name", e.target.value || null)
                  }
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Typ *
                  </label>
                  <select
                    value={member.member_type}
                    onChange={(e) =>
                      updateMember(
                        index,
                        "member_type",
                        e.target.value as MemberType,
                      )
                    }
                    className={fieldClass}
                  >
                    {(
                      Object.entries(MEMBER_TYPE_LABELS) as [
                        MemberType,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label={`Wiek${member.member_type === "child" ? " *" : ""}`}
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
                />
                <Input
                  label="Notatki"
                  type="text"
                  value={member.notes ?? ""}
                  onChange={(e) =>
                    updateMember(index, "notes", e.target.value || null)
                  }
                  placeholder="np. nie lubi wysokości"
                />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Preferencje" />
        <CardBody className="space-y-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Styl wyjazdu
            </label>
            <select
              value={preferences.travel_style}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  travel_style: e.target.value as TravelStyle,
                }))
              }
              className={fieldClass}
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

          <PillCheckboxGroup
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Budżet całkowity (PLN)"
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
            />
            <Input
              label="Budżet na osobę (PLN)"
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
            />
            <Input
              label="Max przesiadki"
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
            />
            <Input
              label="Max czas lotu (h)"
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
            />
          </div>

          <PillCheckboxGroup
            label="Zakwaterowanie"
            options={ACCOMMODATION_OPTIONS}
            selected={preferences.accommodation_types}
            onChange={(vals) =>
              setPreferences((p) => ({ ...p, accommodation_types: vals }))
            }
          />

          <PillCheckboxGroup
            label="Wyżywienie"
            options={MEAL_OPTIONS}
            selected={preferences.meal_plan_preferences}
            onChange={(vals) =>
              setPreferences((p) => ({ ...p, meal_plan_preferences: vals }))
            }
          />

          <PillCheckboxGroup
            label="Dieta"
            options={DIETARY_OPTIONS}
            selected={preferences.dietary_restrictions}
            onChange={(vals) =>
              setPreferences((p) => ({ ...p, dietary_restrictions: vals }))
            }
          />

          <PillCheckboxGroup
            label="Wykluczenia"
            options={EXCLUSION_OPTIONS}
            selected={preferences.exclusions}
            onChange={(vals) =>
              setPreferences((p) => ({ ...p, exclusions: vals }))
            }
          />

          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={preferences.polish_speaking_guide_required}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  polish_speaking_guide_required: e.target.checked,
                }))
              }
              className="rounded border-border-default text-brand-700 focus:ring-brand-100"
            />
            Wymagany polskojęzyczny przewodnik
          </label>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Potrzeby dostępności
            </label>
            <textarea
              value={preferences.accessibility_needs ?? ""}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  accessibility_needs: e.target.value || null,
                }))
              }
              rows={2}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Notatki
            </label>
            <textarea
              value={preferences.notes ?? ""}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  notes: e.target.value || null,
                }))
              }
              rows={2}
              className={fieldClass}
            />
          </div>
        </CardBody>
      </Card>

      {error && (
        <Card className="border-danger/30 bg-red-50/40">
          <CardBody>
            <p className="text-sm text-danger">Błąd: {error}</p>
            {fieldErrors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-danger">
                {fieldErrors.map((fe) => (
                  <li key={fe}>{fe}</li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Zapisuję..."
            : mode === "create"
              ? "Utwórz grupę"
              : "Zapisz zmiany"}
        </Button>
        <Link href={cancelHref}>
          <Button type="button" variant="ghost">
            Anuluj
          </Button>
        </Link>
      </div>
    </form>
  );
}
