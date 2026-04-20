import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      role?: string;
      entrepriseId?: string;
      entrepriseNom?: string;
    };
  }
  interface User {
    role?: string;
    entrepriseId?: string;
    entrepriseNom?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    entrepriseId?: string;
    entrepriseNom?: string;
  }
}
