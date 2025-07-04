// src/app/api/autorizaciones/route.js

import { NextResponse } from 'next/server';

// --- Base de Datos en Memoria (simulada) ---
const autorizacionesDB = [
  { id: 1001, type: 'Práctica Médica', title: 'Tomografía Computada', beneficiary: 'Juan Pérez (25123456789)', date: new Date(2025, 6, 4).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), status: 'Nuevas Solicitudes', isImportant: true },
  { id: 1002, type: 'Internación', title: 'Internación por Apendicitis', beneficiary: 'Maria Lopez (27987654321)', date: new Date(2025, 6, 4).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), status: 'Nuevas Solicitudes', isImportant: false },
  { id: 1003, type: 'Práctica Médica', title: 'Análisis de Sangre Completo', beneficiary: 'Carlos Gomez (20112233445)', date: new Date(2025, 6, 3).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), status: 'En Auditoría', isImportant: false },
  { id: 1004, type: 'Práctica Médica', title: 'Consulta Cardiológica', beneficiary: 'Ana Fernandez (27334455667)', date: new Date(2025, 6, 3).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), status: 'Autorizadas', isImportant: false },
  { id: 1005, type: 'Medicamento', title: 'Medicamento Oncológico', beneficiary: 'Roberto Sanchez (20998877665)', date: new Date(2025, 6, 2).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), status: 'Rechazadas', isImportant: true }
];
let lastId = 1005; 

// --- FUNCIÓN GET: Para leer todas las autorizaciones ---
export async function GET(request) {
  // Simplemente devolvemos la lista completa.
  return NextResponse.json(autorizacionesDB);
}

// --- FUNCIÓN POST: Para crear una nueva autorización ---
export async function POST(request) {
  try {
    const formData = await request.formData();
    const detailsString = formData.get('details');
    if (!detailsString) {
      return NextResponse.json({ message: "Error: Faltan los detalles en el formulario." }, { status: 400 });
    }
    const details = JSON.parse(detailsString);
    if (!details.beneficiaryData || !details.beneficiaryData.cuil) {
      return NextResponse.json({ message: "Error: Faltan los datos del beneficiario." }, { status: 400 });
    }

    const newAuth = {
      id: ++lastId,
      type: formData.get('type'),
      title: formData.get('title'),
      beneficiary: `${details.beneficiaryData.apellido}, ${details.beneficiaryData.nombre} (${details.beneficiaryData.cuil})`,
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      status: 'Nuevas Solicitudes',
      wasEdited: false,
      isImportant: details.isImportant,
      details: details,
    };
    
    autorizacionesDB.unshift(newAuth); // Agregamos la nueva al principio
    return NextResponse.json(newAuth, { status: 201 });

  } catch (error) {
    console.error("Error al crear autorización:", error);
    return NextResponse.json({ message: "Error interno del servidor: " + error.message }, { status: 500 });
  }
}