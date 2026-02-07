import type { JSX } from "react";

const treatmentList = [
  {
    href: "/1",
    name: "Brutalist Sprint",
    note: "loud, fast, unapologetic",
    classes: "bg-[#fde9d9] text-black",
  },
  {
    href: "/2",
    name: "Aurora Stack",
    note: "glass layers + atmospheric glow",
    classes: "bg-[#0b1935] text-cyan-100",
  },
  {
    href: "/3",
    name: "Neon Terminal",
    note: "command-line future interface",
    classes: "bg-black text-lime-300",
  },
  {
    href: "/4",
    name: "Parade Collage",
    note: "kinetic editorial moodboard",
    classes: "bg-[#fff6d8] text-[#10204f]",
  },
  {
    href: "/5",
    name: "Heritage Atelier",
    note: "quiet luxury, modern serif",
    classes: "bg-[#f5f0e8] text-[#251f1a]",
  },
] as const;

export function RouteChooser(): JSX.Element {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#1b2f65,transparent_34%),radial-gradient(circle_at_bottom_right,#ff5c2a,transparent_38%),#0b1020] px-6 pb-16 pt-24">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:42px_42px] opacity-20" />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="font-space text-sm uppercase tracking-[0.22em] text-cyan-200/90">
            Homepage Design Lab
          </p>
          <h1 className="mt-4 font-archivo text-5xl leading-[0.95] text-white sm:text-6xl">
            Five Bold Homepage Treatments
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-200/95 sm:text-lg">
            Each route is intentionally different in tone, typography, color
            system, and motion language. Pick one below to explore.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {treatmentList.map((item, idx) => (
            <a
              key={item.href}
              href={item.href}
              className={[
                "group relative min-h-44 overflow-hidden rounded-3xl border border-white/20 p-5 transition duration-300 hover:-translate-y-1 hover:border-white/60",
                item.classes,
              ].join(" ")}
              style={{ animationDelay: `${idx * 0.07}s` }}
            >
              <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/20 blur-xl transition group-hover:scale-150" />
              <p className="font-mono-pro text-xs">{item.href}</p>
              <h2 className="mt-6 font-space text-2xl font-bold leading-tight">
                {item.name}
              </h2>
              <p className="mt-3 text-sm opacity-80">{item.note}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BrutalistSprint(): JSX.Element {
  const metrics = [
    { label: "Launch Speed", value: "12 days" },
    { label: "Team Output", value: "3.6x" },
    { label: "Adoption", value: "87%" },
  ];

  return (
    <section className="min-h-screen overflow-hidden bg-[#fef4d8] px-6 pb-20 pt-28 text-black">
      <div className="mx-auto max-w-6xl">
        <p className="inline-block border-2 border-black bg-[#ff5a2f] px-4 py-1 font-mono-pro text-xs uppercase tracking-[0.2em] text-white">
          /1 Brutalist Sprint
        </p>
        <div className="mt-7 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h1 className="font-archivo text-5xl leading-[0.88] sm:text-7xl">
              Build the
              <span className="block bg-black px-2 text-[#fef4d8]">
                Week That Wins
              </span>
            </h1>
            <p className="mt-6 max-w-xl border-l-4 border-black pl-4 font-space text-lg font-medium">
              Task Breaker turns messy ambitions into concrete daily sprints,
              then keeps everyone honest with visible momentum.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#"
                className="border-2 border-black bg-black px-6 py-3 font-space text-sm font-bold uppercase tracking-[0.14em] text-[#fef4d8] transition hover:-translate-y-0.5 hover:bg-transparent hover:text-black"
              >
                Start Sprint
              </a>
              <a
                href="#"
                className="border-2 border-black bg-transparent px-6 py-3 font-space text-sm font-bold uppercase tracking-[0.14em] transition hover:-translate-y-0.5 hover:bg-black hover:text-[#fef4d8]"
              >
                Watch Workflow
              </a>
            </div>
          </div>

          <div className="border-4 border-black bg-[#fff8ea] p-6 shadow-[10px_10px_0_0_#000]">
            <p className="font-mono-pro text-xs uppercase tracking-[0.22em]">
              Team Snapshot
            </p>
            <div className="mt-5 space-y-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="border-2 border-black p-3">
                  <p className="font-space text-sm uppercase tracking-[0.12em]">
                    {metric.label}
                  </p>
                  <p className="mt-1 font-archivo text-3xl">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 overflow-hidden border-2 border-black bg-[#ff5a2f] p-1 shadow-[6px_6px_0_0_#000]">
          <div className="overflow-hidden bg-[#fff3c9] py-2 text-black">
            <div className="animate-drift-right whitespace-nowrap font-mono-pro text-sm font-bold uppercase tracking-[0.2em]">
              <span className="mr-8">
                Plan with intensity • Coordinate with clarity • Ship before
                fear arrives •
              </span>
              <span>
                Plan with intensity • Coordinate with clarity • Ship before
                fear arrives •
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AuroraStack(): JSX.Element {
  const cards = [
    {
      title: "Adaptive Roadmaps",
      body: "The plan reshapes itself around constraints, and still keeps the weekly north star in view.",
    },
    {
      title: "Context Threads",
      body: "Workstreams are layered by intent so cross-team dependencies stay visible without noise.",
    },
    {
      title: "Signal Over Activity",
      body: "Progress is measured by milestone certainty instead of task churn or vanity throughput.",
    },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#090f24] px-6 pb-20 pt-28 text-cyan-50">
      <div className="animate-pulse-soft absolute -left-32 top-0 h-72 w-72 rounded-full bg-cyan-400/40 blur-[110px]" />
      <div className="animate-float-slow absolute -right-28 top-20 h-96 w-96 rounded-full bg-fuchsia-500/35 blur-[120px]" />
      <div className="absolute bottom-8 left-1/3 h-60 w-60 rounded-full bg-indigo-500/35 blur-[120px]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:52px_52px] opacity-10" />

      <div className="relative mx-auto max-w-6xl">
        <p className="font-space text-xs uppercase tracking-[0.26em] text-cyan-200/90">
          /2 Aurora Stack
        </p>
        <h1 className="mt-5 max-w-4xl font-space text-5xl font-bold leading-[0.95] sm:text-7xl">
          Product execution with cinematic calm
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-cyan-100/80">
          A layered operating surface for teams that need strategic precision
          without sacrificing creative momentum.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map((card, idx) => (
            <article
              key={card.title}
              className="animate-rise-in rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <h2 className="font-space text-xl font-bold">{card.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-cyan-50/80">
                {card.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#"
            className="rounded-full bg-cyan-200 px-6 py-3 font-space text-sm font-bold uppercase tracking-[0.12em] text-[#0b1830] transition hover:-translate-y-0.5"
          >
            Enter Workspace
          </a>
          <a
            href="#"
            className="rounded-full border border-cyan-100/60 px-6 py-3 font-space text-sm font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-100/20"
          >
            View Demo
          </a>
        </div>
      </div>
    </section>
  );
}

export function NeonTerminal(): JSX.Element {
  const feed = [
    "[08:32] objective accepted: ship calendar sync",
    "[09:05] blockers resolved: auth timeout + stale cache",
    "[11:18] sprint confidence now: 92%",
  ];

  return (
    <section className="relative min-h-screen overflow-hidden bg-black px-6 pb-20 pt-28 text-lime-300">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1d4428,transparent_42%)] opacity-60" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(132,255,96,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(132,255,96,0.06)_1px,transparent_1px)] bg-[size:26px_26px]" />

      <div className="relative mx-auto max-w-5xl font-mono-pro">
        <p className="text-xs uppercase tracking-[0.32em] text-lime-400/85">
          /3 Neon Terminal
        </p>
        <div className="mt-4 rounded-2xl border border-lime-400/45 bg-black/70 p-4">
          <p className="text-xs text-lime-200/70">
            root@taskbreaker:~# ./launch-homepage --mode precision
          </p>
        </div>

        <h1 className="mt-8 text-4xl font-bold leading-tight text-lime-200 sm:text-6xl">
          Command your roadmap like a live system.
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-lime-300/35 bg-[#041106] p-6 shadow-[0_0_45px_rgba(95,255,77,0.2)]">
            <p className="text-xs uppercase tracking-[0.18em] text-lime-200/70">
              Real-time status feed
            </p>
            <div className="mt-4 space-y-3 text-sm text-lime-100/90">
              {feed.map((line) => (
                <p key={line} className="rounded-lg bg-lime-300/10 px-3 py-2">
                  {line}
                </p>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-lime-400/45 bg-black/75 px-3 py-2 text-sm">
              <span className="text-lime-500">$</span> taskbreaker deploy
              --team pulse-unit
              <span className="ml-2 animate-pulse">▋</span>
            </div>
          </div>

          <aside className="rounded-2xl border border-lime-300/35 bg-[#07140a] p-6">
            <h2 className="text-sm uppercase tracking-[0.18em] text-lime-200/80">
              Execution Signals
            </h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-lime-500">uptime</dt>
                <dd className="text-lg text-lime-100">99.99%</dd>
              </div>
              <div>
                <dt className="text-lime-500">active squads</dt>
                <dd className="text-lg text-lime-100">14</dd>
              </div>
              <div>
                <dt className="text-lime-500">velocity trend</dt>
                <dd className="text-lg text-lime-100">+22%</dd>
              </div>
            </dl>
            <a
              href="#"
              className="mt-7 inline-block rounded-md border border-lime-300/45 bg-lime-300/15 px-4 py-2 text-xs uppercase tracking-[0.2em] transition hover:bg-lime-300/30"
            >
              Boot Session
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function ParadeCollage(): JSX.Element {
  const stickers = ["Today matters", "Move as one", "Less waiting", "More making"];

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#fff6d5] px-6 pb-20 pt-28 text-[#132262]">
      <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#ff5640]/40 blur-2xl" />
      <div className="absolute right-0 top-0 h-[26rem] w-[26rem] rounded-full bg-[#55b7ff]/45 blur-3xl" />
      <div className="absolute bottom-4 left-1/2 h-56 w-56 rounded-full bg-[#ffc037]/40 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <p className="font-space text-xs uppercase tracking-[0.24em] text-[#1a3999]/80">
          /4 Parade Collage
        </p>
        <h1 className="mt-4 font-bebas text-7xl leading-[0.8] sm:text-9xl">
          PLAN LOUD.
          <span className="block text-[#ff4333]">SHIP PROUD.</span>
        </h1>
        <p className="mt-5 max-w-xl font-space text-lg font-medium text-[#243880]">
          A celebratory layout for teams that treat shipping like performance
          art: playful energy, sharp hierarchy, and zero blandness.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-3xl border-2 border-[#10297f] bg-white/80 p-6 shadow-[8px_8px_0_0_#10297f]">
            <p className="font-space text-sm uppercase tracking-[0.14em]">
              Design Sprints • Weekly Rhythm
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {stickers.map((sticker, idx) => (
                <div
                  key={sticker}
                  className={[
                    "rounded-xl border-2 border-[#10297f] px-4 py-3 font-space text-base font-bold",
                    idx % 2 === 0
                      ? "bg-[#ffdb61] -rotate-1"
                      : "bg-[#99deff] rotate-1",
                  ].join(" ")}
                >
                  {sticker}
                </div>
              ))}
            </div>
            <a
              href="#"
              className="mt-6 inline-block rounded-full bg-[#132262] px-6 py-3 font-space text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5"
            >
              Start the Parade
            </a>
          </div>

          <aside className="relative">
            <div className="absolute left-8 top-0 h-44 w-44 rounded-3xl bg-[#ff5444] p-5 text-white shadow-[6px_6px_0_0_#10297f]">
              <p className="font-space text-xs uppercase tracking-[0.14em]">
                Launches
              </p>
              <p className="mt-4 font-bebas text-6xl leading-none">18</p>
            </div>
            <div className="ml-24 mt-24 h-44 w-44 -rotate-6 rounded-3xl bg-[#55b8ff] p-5 text-[#10297f] shadow-[6px_6px_0_0_#10297f]">
              <p className="font-space text-xs uppercase tracking-[0.14em]">
                Happy Users
              </p>
              <p className="mt-4 font-bebas text-6xl leading-none">94%</p>
            </div>
            <div className="mt-8 h-44 w-44 rotate-3 rounded-3xl bg-[#ffe06f] p-5 text-[#10297f] shadow-[6px_6px_0_0_#10297f]">
              <p className="font-space text-xs uppercase tracking-[0.14em]">
                Focus Score
              </p>
              <p className="mt-4 font-bebas text-6xl leading-none">A+</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function HeritageAtelier(): JSX.Element {
  return (
    <section className="min-h-screen bg-[#f6f0e7] px-6 pb-20 pt-28 text-[#2a221b]">
      <div className="mx-auto max-w-6xl">
        <p className="font-space text-xs uppercase tracking-[0.24em] text-[#6a5646]">
          /5 Heritage Atelier
        </p>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <h1 className="font-cormorant text-6xl leading-[0.9] sm:text-8xl">
              Strategy with
              <span className="block italic text-[#8d5f3d]">timeless poise</span>
            </h1>
            <p className="mt-6 max-w-xl font-manrope text-lg text-[#4b3d32]">
              A calm, editorial surface for teams that prefer depth over noise.
              Every objective is articulated with craft, pace, and clarity.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#"
                className="rounded-full bg-[#2a221b] px-6 py-3 font-space text-xs font-bold uppercase tracking-[0.17em] text-[#f6f0e7] transition hover:-translate-y-0.5"
              >
                Request Access
              </a>
              <a
                href="#"
                className="rounded-full border border-[#7d6652] px-6 py-3 font-space text-xs font-semibold uppercase tracking-[0.17em] text-[#4b3d32] transition hover:bg-[#efe4d7]"
              >
                Read Manifesto
              </a>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-[#cfb8a2] bg-[#fbf7f1] p-6">
              <p className="font-space text-xs uppercase tracking-[0.18em] text-[#725f50]">
                Atelier Notes
              </p>
              <p className="mt-3 font-cormorant text-3xl leading-tight">
                &ldquo;Our task board should reflect intent, not just volume.&rdquo;
              </p>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="rounded-2xl border border-[#cfb8a2] bg-[#fbf7f1] p-5">
                <p className="font-space text-xs uppercase tracking-[0.14em] text-[#7f6858]">
                  Projects
                </p>
                <p className="mt-2 font-cormorant text-4xl">32</p>
              </div>
              <div className="rounded-2xl border border-[#cfb8a2] bg-[#fbf7f1] p-5">
                <p className="font-space text-xs uppercase tracking-[0.14em] text-[#7f6858]">
                  Clarity
                </p>
                <p className="mt-2 font-cormorant text-4xl">98%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[#cfb8a2] bg-[#fbf7f1] p-5">
            <p className="font-space text-xs uppercase tracking-[0.14em] text-[#7f6858]">
              Ritual 01
            </p>
            <h2 className="mt-2 font-cormorant text-3xl">Define the week</h2>
            <p className="mt-2 text-sm text-[#564a41]">
              Set one primary outcome and align every execution lane to it.
            </p>
          </article>
          <article className="rounded-2xl border border-[#cfb8a2] bg-[#fbf7f1] p-5">
            <p className="font-space text-xs uppercase tracking-[0.14em] text-[#7f6858]">
              Ritual 02
            </p>
            <h2 className="mt-2 font-cormorant text-3xl">Trim the noise</h2>
            <p className="mt-2 text-sm text-[#564a41]">
              Remove non-critical work to preserve attention for leverage tasks.
            </p>
          </article>
          <article className="rounded-2xl border border-[#cfb8a2] bg-[#fbf7f1] p-5">
            <p className="font-space text-xs uppercase tracking-[0.14em] text-[#7f6858]">
              Ritual 03
            </p>
            <h2 className="mt-2 font-cormorant text-3xl">Review with grace</h2>
            <p className="mt-2 text-sm text-[#564a41]">
              Use calm retrospectives to convert insight into stronger next
              cycles.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
