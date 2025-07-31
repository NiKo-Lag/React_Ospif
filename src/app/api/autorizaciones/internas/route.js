import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request) {
  console.log("[DEBUG-BACKEND] Petición recibida en /api/autorizaciones/internas");

  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'auditor', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Acceso no autorizado.' }, { status: 403 });
  }

  // Obtener parámetros de filtro de la URL
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const status = searchParams.get('status');
  const cuil = searchParams.get('cuil');

  console.log("[DEBUG-BACKEND] Filtros recibidos:", { dateFrom, dateTo, status, cuil });

  const client = await pool.connect();
  try {
    // Función helper para construir condiciones WHERE
    const buildWhereConditions = (baseCondition, tableAlias = '', applyStatusFilter = true) => {
      const conditions = [baseCondition];
      const params = [];
      let paramIndex = 1;

      if (dateFrom) {
        conditions.push(`${tableAlias}created_at >= $${paramIndex}`);
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        conditions.push(`${tableAlias}created_at <= $${paramIndex}`);
        params.push(dateTo + ' 23:59:59');
        paramIndex++;
      }

      if (status && applyStatusFilter) {
        conditions.push(`${tableAlias}status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (cuil) {
        // Para autorizaciones, buscar por beneficiary_name (nombre completo)
        // Para internaciones y medicación, buscar por beneficiary_cuil (número)
        if (tableAlias === 'a.') {
          // En autorizaciones, el CUIL podría estar en el nombre o necesitamos otra lógica
          // Por ahora, no aplicamos filtro de CUIL a autorizaciones
          console.log("[DEBUG-BACKEND] Filtro de CUIL no aplicado a autorizaciones (no hay columna beneficiary_cuil)");
        } else {
          conditions.push(`${tableAlias}beneficiary_cuil ILIKE $${paramIndex}`);
          params.push(`%${cuil}%`);
          paramIndex++;
        }
      }

      return {
        whereClause: conditions.join(' AND '),
        params
      };
    };

    console.log("[DEBUG-BACKEND] Ejecutando consulta de autorizaciones...");
    
    // Construir condiciones para autorizaciones
    const authConditions = buildWhereConditions('a.internment_id IS NULL', 'a.', true);
    
    // Consulta 1: Obtener las autorizaciones de prácticas médicas
    const authQuery = `
      SELECT 
        a.id::TEXT, 
        to_char(a.created_at, 'DD/MM/YYYY') as date, 
        a.type, 
        a.title, 
        a.beneficiary_name as beneficiary, 
        a.status, 
        a.is_important as "isImportant", 
        p.razonsocial as provider_name,
        u.name as auditor_name,
        'practice' as "requestType"
      FROM authorizations a
      LEFT JOIN prestadores p ON a.provider_id = p.id
      LEFT JOIN users u ON a.auditor_id = u.id
      WHERE ${authConditions.whereClause};
    `;
    const authResult = await client.query(authQuery, authConditions.params);
    console.log(`[DEBUG-BACKEND] Autorizaciones obtenidas: ${authResult.rows.length}`);

    // Consulta 2: Obtener las internaciones con estado 'INICIADA'
    console.log("[DEBUG-BACKEND] Ejecutando consulta de internaciones...");
    
    // Construir condiciones para internaciones (sin filtro de estado ya que internaciones siempre son 'INICIADA')
    const internmentConditions = buildWhereConditions('i.status = \'INICIADA\'', 'i.', false);
    
    const internmentQuery = `
      SELECT
        i.id::TEXT,
        to_char(i.created_at, 'DD/MM/YYYY') as date,
        'Internación' as type,
        'Denuncia de Internación' as title,
        i.beneficiary_name as beneficiary,
        'Nuevas Solicitudes' as status, -- Normalizamos el estado para que el Kanban lo entienda
        false as "isImportant",
        p.razonsocial as provider_name,
        NULL as auditor_name,
        'internment' as "requestType",
        i.beneficiary_cuil,
        i.notifying_provider_id
      FROM internments i
      LEFT JOIN prestadores p ON i.notifying_provider_id = p.id
      WHERE ${internmentConditions.whereClause};
    `;
    const internmentResult = await client.query(internmentQuery, internmentConditions.params);
    console.log(`[DEBUG-BACKEND] Internaciones obtenidas: ${internmentResult.rows.length}`);

    // Consulta 3: Obtener las órdenes de medicación
    console.log("[DEBUG-BACKEND] Ejecutando consulta de medicación...");
    
    // Construir condiciones para medicación (sin filtro de estado ya que medicación tiene estados específicos)
    const medicationConditions = buildWhereConditions('mr.status IN (\'Creada\', \'En Cotización\', \'Pendiente de Autorización\', \'Autorizada\', \'Rechazada\')', 'mr.', false);
    
    const medicationQuery = `
      SELECT
        mr.id::TEXT,
        to_char(mr.created_at, 'DD/MM/YYYY') as date,
        'Medicación' as type,
        'Orden de Medicación' as title,
        mr.beneficiary_name as beneficiary,
        CASE 
          WHEN mr.status = 'Creada' THEN 'Nuevas Solicitudes'
          WHEN mr.status = 'En Cotización' THEN 'En Auditoría'
          WHEN mr.status = 'Pendiente de Revisión' THEN 'En Auditoría'
          WHEN mr.status = 'Autorizada' THEN 'Autorizada'
          WHEN mr.status = 'Rechazada' THEN 'Rechazada'
          ELSE mr.status
        END as status,
        false as "isImportant",
        NULL as provider_name,
        NULL as auditor_name,
        'medication' as "requestType",
        mr.beneficiary_cuil,
        1 as items_count,
        0 as total_quotations_count,
        0 as completed_quotations_count,
        mr.high_cost,
        mr.quotation_status,
        mr.audit_required
      FROM medication_requests mr
      WHERE ${medicationConditions.whereClause};
    `;
    const medicationResult = await client.query(medicationQuery, medicationConditions.params);
    console.log(`[DEBUG-BACKEND] Órdenes de medicación obtenidas: ${medicationResult.rows.length}`);

    const combinedResults = [...authResult.rows, ...internmentResult.rows, ...medicationResult.rows];
    
    // Ordenar por fecha descendente (opcional pero recomendado)
    combinedResults.sort((a, b) => new Date(b.date.split('/').reverse().join('-')) - new Date(a.date.split('/').reverse().join('-')));
    
    console.log(`[DEBUG-BACKEND] Devolviendo ${combinedResults.length} resultados combinados.`);
    return NextResponse.json(combinedResults);

  } catch (error) {
    console.error("[DEBUG-BACKEND] Error en /api/autorizaciones/internas:", error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener autorizaciones combinadas.' }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
} 