// src/app/api/auth/[...nextauth]/route.js

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Credenciales inválidas.');
        }

        const client = await pool.connect();
        try {
          // Primero, buscar en la tabla de usuarios internos (operadores, admin, auditores)
          let userQuery = 'SELECT id, name, role, email, password FROM users WHERE email = $1';
          let result = await client.query(userQuery, [credentials.email]);
          let user = result.rows[0];

          // Si no se encuentra como usuario interno, buscar en la tabla de prestadores
          if (!user) {
            userQuery = 'SELECT id, email, razonsocial as name, password, \'provider\' as role FROM prestadores WHERE email = $1';
            result = await client.query(userQuery, [credentials.email]);
            user = result.rows[0];
          }
          
          if (!user) {
            throw new Error('Usuario no encontrado.');
          }
          
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            throw new Error('Contraseña incorrecta.');
          }

          // Devolvemos el objeto del usuario con su rol
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("Authentication Error:", error.message);
          throw new Error('Error de autenticación. Verifique sus credenciales.');
        } finally {
          client.release();
        }
      }
    })
  ],
  pages: {
    signIn: '/login', // Apuntar a la nueva página de login unificada
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Si `user` existe (solo en el login), añadimos sus datos al token
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Añadimos los datos del token a la sesión para que estén disponibles en el cliente
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 