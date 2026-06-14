import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function GroupsListPage() {
  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("travel_groups")
    .select("*, group_members(count)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Moje grupy podróżne</h1>
      <Link href="/app/groups/new" className="underline mb-4 inline-block">
        + Nowa grupa
      </Link>

      {(!groups || groups.length === 0) && (
        <p className="mt-4">
          Nie masz jeszcze żadnej grupy. Stwórz pierwszą żeby zacząć planowanie.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {groups?.map((group) => (
          <li key={group.id}>
            <Link href={`/app/groups/${group.id}`} className="underline">
              {group.name}
            </Link>{" "}
            ({group.group_members[0]?.count ?? 0} osób)
          </li>
        ))}
      </ul>
    </div>
  );
}
