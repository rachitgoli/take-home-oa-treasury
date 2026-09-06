import { LabelVerifier } from "@/components/label-verifier";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Label Verification
        </h1>
        <p className="mt-2 text-lg text-zinc-600">
          Check that label artwork matches the COLA application before approval.
        </p>
      </header>

      <LabelVerifier />
    </main>
  );
}
