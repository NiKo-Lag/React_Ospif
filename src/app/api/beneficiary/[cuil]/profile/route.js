// src/app/api/beneficiary/[cuil]/profile/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

// Las credenciales ahora se leen de las variables de entorno
const SAAS_API_URL = process.env.SAAS_API_URL;
const SAAS_API_AUTH_HEADER = process.env.SAAS_API_AUTH_HEADER;
const SAAS_USERNAME = process.env.SAAS_USERNAME;
const SAAS_PASSWORD = process.env.SAAS_PASSWORD;

// NOTA: En una aplicación real, el token debería cachearse de forma más robusta.
async function getSaasToken() {
  try {
    console.log('Attempting to get SAAS token...');
    console.log('SAAS_API_URL:', SAAS_API_URL);
    console.log('SAAS_API_AUTH_HEADER exists:', !!SAAS_API_AUTH_HEADER);
    console.log('SAAS_USERNAME exists:', !!SAAS_USERNAME);
    console.log('SAAS_PASSWORD exists:', !!SAAS_PASSWORD);
    
    const response = await fetch(`${SAAS_API_URL}/Account/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': SAAS_API_AUTH_HEADER 
      },
      body: JSON.stringify({ 
        "userName": SAAS_USERNAME, 
        "password": SAAS_PASSWORD 
      })
    });
    
    console.log('SAAS login response status:', response.status);
    console.log('SAAS login response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('SAAS login response data:', data);
    
    if (!response.ok || !data.token) {
      console.error('SAAS login failed:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      throw new Error(`No se pudo autenticar con el servicio externo. Status: ${response.status}`);
    }
    
    console.log('SAAS token obtained successfully');
    return data.token;
  } catch (error) {
    console.error("Error en getSaasToken:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

export async function GET(request, { params }) {
  console.log('API Profile called with params:', params);
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log('No session found');
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    const { cuil } = params;
    console.log('Processing CUIL:', cuil);

    if (!cuil || !/^\d{11}$/.test(cuil)) {
      console.log('Invalid CUIL format:', cuil);
      return NextResponse.json({ message: 'Formato de CUIL inválido.' }, { status: 400 });
    }

    // Verificar variables de entorno
    console.log('Checking environment variables...');
    console.log('SAAS_API_URL exists:', !!SAAS_API_URL);
    console.log('SAAS_API_AUTH_HEADER exists:', !!SAAS_API_AUTH_HEADER);
    console.log('SAAS_USERNAME exists:', !!SAAS_USERNAME);
    console.log('SAAS_PASSWORD exists:', !!SAAS_PASSWORD);

    if (!SAAS_API_URL || !SAAS_API_AUTH_HEADER || !SAAS_USERNAME || !SAAS_PASSWORD) {
      console.error('Missing required environment variables');
      return NextResponse.json({ message: 'Configuración incompleta del servicio.' }, { status: 503 });
    }

    console.log('Getting SAAS token...');
    // 1. Obtener datos básicos del beneficiario desde SAAS
    const token = await getSaasToken();
    console.log('SAAS token obtained successfully');
    
    const saasResponse = await fetch(`${SAAS_API_URL}/Afiliado/Padron?keyword=${cuil}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('SAAS response status:', saasResponse.status);

    if (!saasResponse.ok) {
      if (saasResponse.status === 404) {
        console.log('Beneficiary not found in SAAS');
        return NextResponse.json({ message: `Beneficiario con CUIL ${cuil} no encontrado.` }, { status: 404 });
      }
      throw new Error(`Error en la consulta al padrón de SAAS: ${saasResponse.statusText}`);
    }
    
    const saasData = await saasResponse.json();
    console.log('SAAS data received:', saasData);
    
    if (!saasData.items || saasData.items.length === 0) {
      console.log('No items in SAAS response');
      return NextResponse.json({ message: `Beneficiario con CUIL ${cuil} no encontrado.` }, { status: 404 });
    }
    
    const beneficiaryData = saasData.items[0];
    console.log('Beneficiary data:', beneficiaryData);

    // Si el campo 'nombre' está vacío pero 'apellido' contiene datos,
    // asumimos que 'apellido' tiene el nombre completo y lo corregimos.
    if (!beneficiaryData.nombre && beneficiaryData.apellido) {
      beneficiaryData.nombre = beneficiaryData.apellido;
    }

    console.log('Querying local database for history...');
    // 2. Obtener historial de solicitudes desde la base de datos local
    const historyQuery = `
      SELECT 
        'Internación' as type,
        id,
        beneficiary_cuil as beneficiary_cuil,
        admission_datetime as date,
        presumptive_diagnosis as description,
        CAST(notifying_provider_id AS VARCHAR) as provider,
        CAST(status AS VARCHAR) as status
      FROM internments 
      WHERE beneficiary_cuil = $1
      
      UNION ALL
      
      SELECT 
        'Prácticas' as type,
        id,
        beneficiary_cuil,
        created_at as date,
        title as description,
        CAST(provider_id AS VARCHAR) as provider,
        CAST(status AS VARCHAR) as status
      FROM authorizations 
      WHERE beneficiary_cuil = $1 AND type = 'Práctica Médica'
      
      UNION ALL
      
      SELECT 
        'Medicación' as type,
        id,
        beneficiary_cuil,
        created_at as date,
        medication_name as description,
        NULL as provider,
        CAST(status AS VARCHAR) as status
      FROM medication_requests 
      WHERE beneficiary_cuil = $1
      
      UNION ALL
      
      SELECT 
        'Prótesis' as type,
        id,
        beneficiary_cuil,
        created_at as date,
        title as description,
        CAST(provider_id AS VARCHAR) as provider,
        CAST(status AS VARCHAR) as status
      FROM authorizations 
      WHERE beneficiary_cuil = $1 AND type = 'Prótesis'
      
      UNION ALL
      
      SELECT 
        'Traslado' as type,
        id,
        beneficiary_cuil,
        created_at as date,
        title as description,
        CAST(provider_id AS VARCHAR) as provider,
        CAST(status AS VARCHAR) as status
      FROM authorizations 
      WHERE beneficiary_cuil = $1 AND type = 'Traslado'
      
      ORDER BY date DESC
      LIMIT 50
    `;

    const historyResult = await pool.query(historyQuery, [cuil]);
    console.log('History query completed, rows found:', historyResult.rows.length);
    const history = historyResult.rows.map(row => ({
      id: row.id,
      type: row.type,
      date: row.date,
      description: row.description || 'Sin descripción',
      provider: row.provider || 'N/A',
      status: row.status
    }));

    console.log('Querying beneficiary profile...');
    // 3. Obtener datos adicionales del beneficiario (si existen en la base de datos local)
    const profileQuery = `
      SELECT 
        internal_profile,
        chronic_conditions,
        chronic_medication,
        alerts
      FROM beneficiary_profiles 
      WHERE beneficiary_cuil = $1
    `;

    let profileData = null;
    try {
      const profileResult = await pool.query(profileQuery, [cuil]);
      if (profileResult.rows.length > 0) {
        profileData = profileResult.rows[0];
        console.log('Profile data found:', profileData);
      } else {
        console.log('No profile data found for CUIL:', cuil);
      }
    } catch (error) {
      console.log('Error querying profile data:', error.message);
    }

    console.log('Building complete profile...');
    // 4. Construir el perfil completo
    const completeProfile = {
      // Datos básicos de SAAS
      cuil: beneficiaryData.cuil,
      nombre: beneficiaryData.nombre,
      numeroDeDocumento: beneficiaryData.numeroDeDocumento,
      fechaNacimiento: beneficiaryData.fechaNacimiento,
      activo: beneficiaryData.activo,
      fSssTipoDeBeneficiario: beneficiaryData.fSssTipoDeBeneficiario,
      fSssParentesco: beneficiaryData.fSssParentesco,
      fSssSexoCodigo: beneficiaryData.fSssSexoCodigo,
      calle: beneficiaryData.calle,
      fSssProvincia: beneficiaryData.fSssProvincia,
      fSssIncapacitadoTipoCodigo: beneficiaryData.fSssIncapacitadoTipoCodigo,
      fSssSituacionDeRevista: beneficiaryData.fSssSituacionDeRevista,
      memberId: beneficiaryData.fSssParentesco?.sssCodigo === '0' 
        ? `${beneficiaryData.cuil}/00` 
        : `${beneficiaryData.cuil}/01`,
      
      // Datos calculados
      edad: calculateAge(beneficiaryData.fechaNacimiento),
      planType: determinePlanType(beneficiaryData.fSssTipoDeBeneficiario),
      
      // Historial de solicitudes
      history: history,
      
      // Datos adicionales del perfil (si existen)
      internalProfile: profileData?.internal_profile || '',
      chronicConditions: profileData?.chronic_conditions ? (() => {
        try {
          return JSON.parse(profileData.chronic_conditions);
        } catch {
          return [];
        }
      })() : [],
      chronicMedication: profileData?.chronic_medication ? (() => {
        try {
          return JSON.parse(profileData.chronic_medication);
        } catch {
          return [];
        }
      })() : [],
      alerts: profileData?.alerts || '',
      
      // Estados calculados
      status: beneficiaryData.activo ? 'Activo' : 'Inactivo',
      reviewStatus: 'Al día', // Esto podría venir de SAAS en el futuro
      hasDisability: false, // Esto podría venir de SAAS en el futuro
    };

    console.log('Complete profile built successfully');
    return NextResponse.json(completeProfile);

  } catch (error) {
    console.error(`Error procesando perfil del beneficiario ${params?.cuil}:`, error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ message: "Servicio no disponible o error interno." }, { status: 503 });
  }
}

function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

function determinePlanType(beneficiaryType) {
  if (!beneficiaryType?.nombre) {
    return 'No especificado';
  }
  
  const typeName = beneficiaryType.nombre.toLowerCase();
  if (typeName.includes('relacion de dependencia')) {
    return 'Platino';
  } else {
    return 'Bordo';
  }
} 