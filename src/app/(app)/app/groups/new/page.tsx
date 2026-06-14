import { GroupForm } from "@/components/features/group-form";

export default function NewGroupPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Nowa grupa podróżna</h1>
      <GroupForm mode="create" />
    </div>
  );
}
