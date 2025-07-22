// src/app/api/beneficiary/[cuil]/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

// Las credenciales ahora se leen de las variables de entorno
const SAAS_API_URL = process.env.SAAS_API_URL;
const SAAS_API_AUTH_HEADER = process.env.SAAS_API_AUTH_HEADER;
const SAAS_USERNAME = process.env.SAAS_USERNAME;
const SAAS_PASSWORD = process.env.SAAS_PASSWORD;

// NOTA: En una aplicación real, el token debería cachearse de forma más robusta.
async function getSaasToken() {
  try {
    const response = await fetch(`${SAAS_API_URL}/Account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': SAAS_API_AUTH_HEADER },
      body: JSON.stringify({ "userName": SAAS_USERNAME, "password": SAAS_PASSWORD })
    });
    const data = await response.json();
    if (!response.ok || !data.token) {
      throw new Error('No se pudo autenticar con el servicio externo.');
    }
    return data.token;
  } catch (error) {
    console.error("Error en getSaasToken:", error);
    throw error;
  }
}

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
  }

  const { cuil } = params;

  if (!cuil || !/^\d{11}$/.test(cuil)) {
    return NextResponse.json({ message: 'Formato de CUIL inválido.' }, { status: 400 });
  }

  try {
    const token = await getSaasToken();
    const saasResponse = await fetch(`${SAAS_API_URL}/Afiliado/Padron?keyword=${cuil}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!saasResponse.ok) {
      if (saasResponse.status === 404) {
        return NextResponse.json({ message: `Beneficiario con CUIL ${cuil} no encontrado.` }, { status: 404 });
      }
      throw new Error(`Error en la consulta al padrón de SAAS: ${saasResponse.statusText}`);
    }
    
    const data = await saasResponse.json();
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ message: `Beneficiario con CUIL ${cuil} no encontrado.` }, { status: 404 });
    }
    
    // --- SOLUCIÓN: NORMALIZACIÓN DE DATOS ---
    const beneficiaryData = data.items[0];

    // Si el campo 'nombre' está vacío pero 'apellido' contiene datos,
    // asumimos que 'apellido' tiene el nombre completo y lo corregimos.
    if (!beneficiaryData.nombre && beneficiaryData.apellido) {
        beneficiaryData.nombre = beneficiaryData.apellido;
    }
    // --- FIN DE LA SOLUCIÓN ---

    // Devolvemos el objeto del beneficiario ya corregido
    return NextResponse.json(beneficiaryData);

  } catch (error) {
    console.error(`Error procesando CUIL ${cuil}:`, error);
    return NextResponse.json({ message: "Servicio no disponible o error interno." }, { status: 503 });
  }
}
