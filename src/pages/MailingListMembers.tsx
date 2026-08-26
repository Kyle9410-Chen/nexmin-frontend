import { Link, useParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import MemberTable from "@/components/mailingList/MemberTable";

export default function MailingListMembers() {
  const { groupKey = "" } = useParams();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <Link
        to="/mailing-lists"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        Back to mailing lists
      </Link>

      <MemberTable groupKey={groupKey} />
    </div>
  );
}
