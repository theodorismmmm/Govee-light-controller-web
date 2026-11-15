import Link from "next/link";

const steps = [
  {
    num: "01",
    title: "Connect a light API",
    body: "Add a Govee API key or LIFX access token. OpenLights stores credentials only in your browser.",
  },
  {
    num: "02",
    title: "See every light clearly",
    body: "Devices from each linked provider appear in one overview — groups and individual lights, ready to control.",
  },
  {
    num: "03",
    title: "Control with precision",
    body: "Tune color and brightness, apply presets, and schedule actions from a calm black-and-white dashboard.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="beam absolute -left-[20%] -top-[30%]" />
        <div className="beam beam-secondary absolute right-[-10%] top-[10%]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,7,8,0.2) 0%, rgba(7,7,8,0.85) 55%, #070708 100%), radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.12), transparent 60%)",
          }}
        />
        <div className="grain" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
          }}
        />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight">
          OpenLights
        </div>
        <Link
          href="/connect"
          className="text-sm text-[var(--fg-muted)] transition hover:text-white"
        >
          Connect API
        </Link>
      </header>

      <main className="relative z-10">
        <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-6xl flex-col justify-center px-6 pb-24 pt-8">
          <p className="animate-rise mb-5 text-xs font-medium uppercase tracking-[0.28em] text-[var(--fg-dim)]">
            Multi-provider light control
          </p>
          <h1
            className="animate-rise-delay-1 font-[family-name:var(--font-syne)] text-[clamp(3.4rem,12vw,7.5rem)] font-extrabold tracking-[-0.03em] text-white"
            style={{ lineHeight: 1.15, overflow: "visible", paddingBottom: "0.12em" }}
          >
            OpenLights
          </h1>
          <p className="animate-rise-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-[var(--fg-muted)] md:text-xl">
            A professional browser dashboard for Govee and LIFX. Color,
            brightness, presets, and schedules — powered by your own API keys.
          </p>
          <div className="animate-rise-delay-3 mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/connect"
              className="cta-pulse relative z-20 inline-flex h-14 items-center justify-center rounded-full bg-white px-10 text-base font-semibold tracking-wide text-black transition hover:bg-zinc-200"
            >
              Start now
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-14 items-center justify-center rounded-full border border-white/20 px-8 text-base text-[var(--fg-muted)] transition hover:border-white/40 hover:text-white"
            >
              How it works
            </a>
          </div>
        </section>

        <section
          id="how-it-works"
          className="relative border-t border-white/10 bg-[rgba(10,10,12,0.85)] backdrop-blur-sm"
        >
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="max-w-2xl">
              <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold tracking-tight md:text-4xl">
                How OpenLights works
              </h2>
              <p className="mt-4 text-[var(--fg-muted)]">
                Built on official cloud APIs — no account lock-in, no cloud of
                ours holding your keys.
              </p>
            </div>

            <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
              {steps.map((step) => (
                <li key={step.num} className="relative">
                  <div className="font-[family-name:var(--font-syne)] text-5xl font-bold text-white/15">
                    {step.num}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-20 grid gap-6 border-t border-white/10 pt-12 md:grid-cols-3">
              {[
                {
                  title: "Local key storage",
                  body: "API keys stay in browser storage on this device.",
                },
                {
                  title: "Govee + LIFX",
                  body: "One dashboard for both providers, with live power, RGB, Kelvin, and brightness.",
                },
                {
                  title: "Schedules",
                  body: "Queue timed actions for individual lamps or groups while the dashboard is open.",
                },
              ].map((item) => (
                <div key={item.title}>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-16 flex justify-center">
              <Link
                href="/connect"
                className="inline-flex h-14 items-center justify-center rounded-full bg-white px-10 text-base font-semibold text-black transition hover:bg-zinc-200"
              >
                Start now
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-6 py-8 text-center text-xs text-[var(--fg-dim)]">
        OpenLights uses the Govee Open API and LIFX Cloud API. Govee and LIFX
        are trademarks of their respective owners.
      </footer>
    </div>
  );
}
