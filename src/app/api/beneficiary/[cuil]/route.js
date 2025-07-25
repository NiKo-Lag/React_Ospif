// src/app/api/beneficiary/[cuil]/route.js

import { NextResponse } from 'next/server';
<<<<<<< HEAD
=======
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
>>>>>>> master

// La lógica para la API externa es la misma que en tu server.js original
const SAAS_API_URL = 'https://fosforo.client-api.saas.com.ar/api';
const SAAS_API_AUTH_HEADER = 'Basic c2Fhcy1iYXNpYzoyMldGK2VVXmJm';
const SAAS_USERNAME = 'soporte@ospif.ar';
const SAAS_PASSWORD = 'sistemasOSPIF24';

// NOTA: En una aplicación real, el token debería cachearse de forma más robusta.
async function getSaasToken() {
<<<<<<< HEAD
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

// El 'params' contendrá el valor de [cuil] de la URL
export async function GET(request, { params }) {
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
    
    // Devolvemos el primer resultado encontrado
    return NextResponse.json(data.items[0]);

  } catch (error) {
    console.error(`Error procesando CUIL ${cuil}:`, error);
    return NextResponse.json({ message: "Servicio no disponible o error interno." }, { status: 503 });
  }
}
=======
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
  // --- 1. VERIFICACIÓN DE SESIÓN ---
  const tokenCookie = cookies().get('token');
  if (!tokenCookie) {
    return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
  }
  const decodedSession = verifyToken(tokenCookie.value);
  if (!decodedSession) {
      return NextResponse.json({ message: 'Sesión inválida o expirada.' }, { status: 401 });
  }
  // --- FIN DE VERIFICACIÓN ---

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
>>>>>>> master
