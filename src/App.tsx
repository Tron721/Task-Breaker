import {
  AuroraStack,
  BrutalistSprint,
  HeritageAtelier,
  NeonTerminal,
  ParadeCollage,
  RouteChooser,
} from "./treatments";

const normalizePath = (pathname: string): string => {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
};

const routes: Record<string, () => JSX.Element> = {
  "/1": BrutalistSprint,
  "/2": AuroraStack,
  "/3": NeonTerminal,
  "/4": ParadeCollage,
  "/5": HeritageAtelier,
};

export default function App(): JSX.Element {
  const path = normalizePath(window.location.pathname);
  const Page = routes[path];

  if (!Page) {
    return <RouteChooser />;
  }

  return (
    <main className="min-h-screen">
      <RouteLinks activePath={path} />
      <Page />
    </main>
  );
}

function RouteLinks({ activePath }: { activePath: string }): JSX.Element {
  const links = ["/1", "/2", "/3", "/4", "/5"];

  return (
    <div className="fixed left-4 top-4 z-50 rounded-full border border-white/30 bg-black/25 p-1 backdrop-blur">
      <div className="flex gap-1">
        {links.map((href) => {
          const active = activePath === href;
          return (
            <a
              key={href}
              href={href}
              className={[
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm transition",
                active
                  ? "bg-white text-black"
                  : "bg-transparent text-white hover:bg-white/20",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              {href.replace("/", "")}
            </a>
          );
        })}
      </div>
    </div>
  );
}
