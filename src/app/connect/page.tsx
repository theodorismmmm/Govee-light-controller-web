"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  enableDemoMode,
  getApiKey,
  isDemoMode,
  setApiKey,
} from "@/lib/storage";

export default function ConnectPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getApiKey() || isDemoMode()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = key.trim();
    if (trimmed.length < 8) {
      setError("Enter a valid Govee API key.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/govee/devices", {
        headers: { "x-govee-api-key": trimmed },
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Could not verify API key");
      }
      setApiKey(trimmed);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  function onDemo() {
    enableDemoMode();
    router.push("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="beam absolute left-[10%] top-[-20%]" />
        <div className="grain" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.08), transparent 55%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="mb-10 text-sm text-[var(--fg-dim)] transition hover:text-white"
        >
          Back to OpenLights
        </Link>

        <h1 className="font-[family-name:var(--font-syne)] text-4xl font-bold tracking-tight">
          Connect Govee
        </h1>
        <p className="mt-3 text-[var(--fg-muted)]">
          Paste your Govee developer API key. It is saved in this browser only
          and sent with each control request.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
              Govee API key
            </span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="h-14 w-full rounded-2xl border border-white/15 bg-white/[0.04] px-4 text-white outline-none transition placeholder:text-white/25 focus:border-white/40 focus:bg-white/[0.06]"
            />
          </label>

          {error ? (
            <p className="text-sm text-white/80" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center rounded-full bg-white text-base font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? "Verifying…" : "Continue to dashboard"}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-8">
          <p className="text-sm text-[var(--fg-muted)]">
            Get a key from the Govee developer portal for your account, then
            enable API access for your devices.
          </p>
          <button
            type="button"
            onClick={onDemo}
            className="mt-5 text-sm font-medium text-white underline-offset-4 hover:underline"
          >
            Explore with sample lights
          </button>
        </div>
      </div>
    </div>
  );
}
