import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Senha",
      credentials: {
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const appPassword = process.env.APP_PASSWORD;
        if (!appPassword) throw new Error("APP_PASSWORD não configurado");
        if (credentials?.password === appPassword) {
          return { id: "1", name: "Usuário" };
        }
        return null;
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
