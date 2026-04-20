import { signIn } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  async function action(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: searchParams.next ?? "/dashboard",
      });
    } catch (err) {
      if ((err as Error).message?.includes("NEXT_REDIRECT")) throw err;
      redirect(`/login?error=1&next=${searchParams.next ?? ""}`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">FASTIBAT — Compta</CardTitle>
          <CardDescription>
            ERP comptable BTP · SYSCOHADA révisé · Côte d&apos;Ivoire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input id="email" name="email" type="email" required placeholder="admin@fastibat.ci" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <Input id="password" name="password" type="password" required />
            </div>
            {searchParams.error && (
              <p className="text-sm text-destructive">Identifiants invalides.</p>
            )}
            <Button type="submit" className="w-full">
              Se connecter
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Par défaut après seed : <code>admin@fastibat.ci</code> /{" "}
            <code>admin123!</code>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
