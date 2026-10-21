import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ArrowLeftRight, FilePlus2, BarChart3, Users, Settings } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight, exact: true },
  { to: "/transfers/new", label: "New Transfer", icon: FilePlus2, exact: true },
  { to: "/reports", label: "Reports", icon: BarChart3, exact: true },
] as const;

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-brand-dark text-primary-foreground md:flex">
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="grid h-7 w-7 place-items-center rounded bg-primary"><ArrowLeftRight className="h-4 w-4" /></div>
        <span className="text-sm font-bold tracking-[0.18em]">TRANSFERLY</span>
      </div>
      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <Link key={to} to={to} activeOptions={{ exact }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-primary-foreground/70 transition-colors hover:bg-primary-foreground/5 hover:text-primary-foreground"
            activeProps={{ className: "!bg-primary-foreground/10 !text-primary-foreground font-medium" }}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
        <div className="pt-4">
          {[{ l: "Clients", i: Users }, { l: "Settings", i: Settings }].map(({ l, i: Icon }) => (
            <span key={l} className="flex cursor-default items-center gap-3 px-3 py-2 text-sm text-primary-foreground/40"><Icon className="h-4 w-4" />{l}</span>
          ))}
        </div>
      </nav>
      <div className="border-t border-primary-foreground/10 px-5 py-4 text-xs">
        <div className="font-medium">Brady Schnare</div>
        <div className="text-primary-foreground/50">Designed Wealth Management</div>
      </div>
    </aside>
  );
}
