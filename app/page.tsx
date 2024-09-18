import { LogsTable } from "@/app/components/LogsTable";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-5">
      <h1 className="text-4xl font-bold mb-8">
        Alchemy - Pool creation Transactions
      </h1>
      <LogsTable />
    </main>
  );
}
