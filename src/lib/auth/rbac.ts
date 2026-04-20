/**
 * Permissions par rôle (RBAC simple).
 *
 * - ADMIN : tout
 * - COMPTABLE : compta + paie + fiscal + rapports + lecture
 * - CHEF_CHANTIER : saisie chantiers + factures (vente/achat) + paiements
 * - LECTEUR : lecture seule sur tout
 */

import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export type Permission =
  | "user:manage"
  | "entreprise:edit"
  | "compta:write"      // créer/valider écritures
  | "compta:read"
  | "facture:write"
  | "facture:read"
  | "paiement:write"
  | "tiers:write"
  | "tiers:read"
  | "chantier:write"
  | "chantier:read"
  | "paie:write"
  | "paie:read"
  | "fiscal:write"
  | "fiscal:read"
  | "immo:write"
  | "rapport:read"
  | "rapprochement:write";

const MATRIX: Record<Role, Permission[]> = {
  ADMIN: [
    "user:manage", "entreprise:edit",
    "compta:write", "compta:read",
    "facture:write", "facture:read", "paiement:write",
    "tiers:write", "tiers:read",
    "chantier:write", "chantier:read",
    "paie:write", "paie:read",
    "fiscal:write", "fiscal:read",
    "immo:write", "rapport:read", "rapprochement:write",
  ],
  COMPTABLE: [
    "compta:write", "compta:read",
    "facture:write", "facture:read", "paiement:write",
    "tiers:write", "tiers:read",
    "chantier:read",
    "paie:write", "paie:read",
    "fiscal:write", "fiscal:read",
    "immo:write", "rapport:read", "rapprochement:write",
  ],
  CHEF_CHANTIER: [
    "facture:write", "facture:read", "paiement:write",
    "tiers:write", "tiers:read",
    "chantier:write", "chantier:read",
    "compta:read", "rapport:read",
  ],
  LECTEUR: [
    "compta:read", "facture:read", "tiers:read",
    "chantier:read", "paie:read", "fiscal:read",
    "rapport:read",
  ],
};

export function hasPermission(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(perm) ?? false;
}

/**
 * À utiliser dans une server action ou page server :
 *   const role = await requirePermission("facture:write");
 */
export async function requirePermission(perm: Permission): Promise<Role> {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: Role }).role;
  if (!hasPermission(role, perm)) {
    redirect("/dashboard?error=denied");
  }
  return role!;
}
