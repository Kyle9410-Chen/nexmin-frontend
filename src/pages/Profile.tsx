import MyGroupsTable from "@/components/membership/MyGroupsTable";
import ProfileCard from "@/components/profile/ProfileCard";

export default function Profile() {
  return (
    // Narrower than the table pages: this one is a form.
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <ProfileCard />
      {/* Same component and queryKey as /my-groups, so showing it here costs no
          extra request. */}
      <MyGroupsTable />
    </div>
  );
}
