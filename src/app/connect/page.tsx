"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { PROVIDERS, type ProviderId } from "@/lib/providers/types";
import {
  STORAGE_EVENT,
  connectedProviders,
  enableDemoMode,
  getApiKey,
  hasAnyConnection,
  setApiKey,
} from "@/lib/storage";

async function verifyProvider(id: ProviderId, credential: string) {
  if (id === "govee") {
    const res = await fetch("/api/govee/devices", {
      headers: { "x-govee-api-key": credential },
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(json.error || "Could not verify Govee key");
    return;
  }
  if (id === "lifx") {
    const res = await fetch("/api/lifx/devices", {
      headers: { "x-lifx-token": credential },
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(json.error || "Could not verify LIFX token");
    return;
  }
  throw new Error("Unsupported provider");
}

function subscribeStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
}

function getProvidersSnapshot() {
  return connectedProviders().join(",");
}

function getSessionSnapshot() {
  return hasAnyConnection();
}

export default function ConnectPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderId>("govee");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("add") === "1";
  });

  const hasSession = useSyncExternalStore(
    subscribeStorage,
    getSessionSnapshot,
    () => false,
  );
  const providersCsv = useSyncExternalStore(
    subscribeStorage,
    getProvidersSnapshot,
    () => "",
  );
  const linked = useMemo(
    () => (providersCsv ? (providersCsv.split(",") as ProviderId[]) : []),
    [providersCsv],
  );

  useEffect(() => {
    if (hasSession && !adding) {
      router.replace("/dashboard");
    }
  }, [hasSession, adding, router]);

  const active = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = key.trim();
    if (trimmed.length < 8) {
      setError(`Enter a valid ${active.credentialLabel.toLowerCase()}.`);
      return;
    }

    setLoading(true);
    try {
      await verifyProvider(provider, trimmed);
      setApiKey(provider, trimmed);
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
          href={hasSession ? "/dashboard" : "/"}
          className="mb-10 text-sm text-[var(--fg-dim)] transition hover:text-white"
        >
          {hasSession ? "Back to dashboard" : "Back to OpenLights"}
        </Link>

        <h1 className="font-[family-name:var(--font-syne)] text-4xl font-bold tracking-tight">
          {adding ? "Add provider" : "Connect lights"}
        </h1>
        <p className="mt-3 text-[var(--fg-muted)]">
          Link a cloud API. Credentials stay in this browser and are only sent
          with your control requests.
        </p>

        <div
          role="tablist"
          aria-label="Light provider"
          className="mt-10 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/30 p-1"
        >
          {PROVIDERS.map((item) => {
            const selected = provider === item.id;
            const already = linked.includes(item.id) || Boolean(getApiKey(item.id));
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setProvider(item.id);
                  setKey("");
                  setError(null);
                }}
                className={`rounded-xl px-3 py-3 text-left transition ${
                  selected
                    ? "bg-white text-black"
                    : "text-[var(--fg-muted)] hover:text-white"
                }`}
              >
                <span className="block text-sm font-semibold">{item.name}</span>
                <span
                  className={`mt-1 block text-[11px] ${
                    selected ? "text-black/60" : "text-[var(--fg-dim)]"
                  }`}
                >
                  {already ? "Already linked" : item.shortName}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-sm leading-relaxed text-[var(--fg-muted)]">
          {active.description}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-dim)]">
              {active.credentialLabel}
            </span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={active.credentialHint}
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
            {loading ? "Verifying…" : `Continue with ${active.name}`}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-8">
          <p className="text-sm text-[var(--fg-muted)]">{active.docsHint}</p>
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
