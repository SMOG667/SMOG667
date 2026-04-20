import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/tiers", label: "Tiers" },
  { href: "/chantiers", label: "Chantiers" },
  { href: "/devis", label: "Devis" },
  { href: "/factures", label: "Factures" },
  { href: "/ecritures", label: "Écritures" },
  { href: "/tresorerie", label: "Trésorerie" },
  { href: "/immobilisations", label: "Immobilisations" },
  { href: "/paie", label: "Paie" },
  { href: "/fiscal", label: "Fiscal" },
  { href: "/rapports", label: "États financiers" },
  { href: "/parametres", label: "Paramètres" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-muted/30 md:flex md:flex-col">
        <div className="border-b p-4">
          <h1 className="text-lg font-bold text-primary">FASTIBAT</h1>
          <p className="text-xs text-muted-foreground">
            {(session.user as { entrepriseNom?: string }).entrepriseNom ?? "Compta BTP CI"}
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4 text-xs">
          <p className="font-medium">{session.user?.name}</p>
          <p className="text-muted-foreground">{session.user?.email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="ghost" size="sm" className="mt-2 w-full">
              Se déconnecter
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-background p-6">{children}</main>
    </div>
  );
}
