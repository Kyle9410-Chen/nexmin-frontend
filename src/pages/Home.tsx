import { Link } from "react-router";
import { useHealthz } from "@/hooks/useHealthz";
import { getErrMessage } from "@/lib/errors";

export default function Home() {
  const { data, isPending, error } = useHealthz();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <section>
        <h2 className="font-medium">Backend</h2>
        {isPending && <p className="text-gray-500">checking…</p>}
        {error && (
          <p className="text-red-600">
            {getErrMessage(error, "backend unreachable")}
          </p>
        )}
        {data && <p className="text-green-700">{data.status}</p>}
      </section>

      <nav className="mt-6">
        <Link className="underline" to="/mailing-lists">
          Mailing lists
        </Link>
      </nav>
    </main>
  );
}
