// src/app/api/prestadores/all/route.js

import { NextResponse } from 'next/server';

export async function GET(request) {
  // En el futuro, esto leerá de tu base de datos SQLite.
  // Por ahora, usamos datos de prueba para que el formulario funcione.
  const mockProviders = [
    { id: 1, razonSocial: "Hospital Italiano", estado: "activo" },
    { id: 2, razonSocial: "Sanatorio Finochietto", estado: "activo" },
    { id: 3, razonSocial: "Centro de Diagnóstico Dr. Rossi", estado: "activo" },
    { id: 4, razonSocial: "Swiss Medical Center", estado: "inactivo" },
  ];

  const activeProviders = mockProviders.filter(p => p.estado === 'activo');

  return NextResponse.json(activeProviders);
}