import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageContainer, Breadcrumb } from "@/components/layout/Header";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyStateGuide } from "@/components/features/HowItWorksGuide";
import { Icon } from "@/components/ui/Icon";

export default async function GroupsListPage() {
  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("travel_groups")
    .select("*, group_members(count)")
    .order("created_at", { ascending: false });

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Grupy podróżne" },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Moje grupy podróżne
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Zapisz kto jedzie — wiek dzieci, liczba dorosłych — żeby koszty i hotele
            liczyły się per osoba.
          </p>
        </div>
        <Link href="/app/groups/new">
          <Button size="sm">
            <Icon name="plus" size={16} />
            Nowa grupa
          </Button>
        </Link>
      </div>

      {(!groups || groups.length === 0) && (
        <EmptyStateGuide
          title="Nie masz jeszcze żadnej grupy"
          description="Grupa to profil rodziny: kto jedzie, ile osób, wiek dzieci. Nie jest wymagana na początek — możesz najpierw wyszukać aktywności, a grupę dodać później."
          actionHref="/app/groups/new"
          actionLabel="Stwórz pierwszą grupę"
        />
      )}

      <ul className="space-y-3">
        {groups?.map((group) => (
          <li key={group.id}>
            <Card className="card-hover">
              <CardBody className="flex items-center justify-between gap-4">
                <div>
                  <Link
                    href={`/app/groups/${group.id}`}
                    className="font-display text-lg font-bold text-brand-700 hover:underline"
                  >
                    {group.name}
                  </Link>
                  <p className="mt-1 text-sm text-text-secondary">
                    {group.group_members[0]?.count ?? 0} osób
                  </p>
                </div>
                <Icon name="chevron-right" size={20} className="text-text-tertiary" />
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
