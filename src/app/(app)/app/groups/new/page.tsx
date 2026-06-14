import { GroupForm } from "@/components/features/group-form";
import { PageContainer, Breadcrumb } from "@/components/layout/Header";

export default function NewGroupPage() {
  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Grupy", href: "/app/groups" },
          { label: "Nowa grupa" },
        ]}
      />

      <h1 className="font-display mb-2 text-3xl font-bold text-text-primary">
        Nowa grupa podróżna
      </h1>
      <p className="mb-8 text-sm text-text-secondary">
        Kto jedzie, jakie macie preferencje i budżet — używane przy liczeniu kosztów
        i dopasowywaniu hoteli.
      </p>

      <GroupForm mode="create" />
    </PageContainer>
  );
}
