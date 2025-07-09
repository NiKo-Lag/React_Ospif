// src/components/autorizaciones/KanbanBoard.jsx

"use client";

import { useMemo } from "react";
import KanbanColumn from "./KanbanColumn";

export default function KanbanBoard({ authorizations, loading, error, dateFilter, searchTerm, onViewDetails }) {

  const filteredAuthorizations = useMemo(() => {
    if (!authorizations) return [];
    
    const dateFiltered = dateFilter 
      ? authorizations.filter(auth => {
          const formattedDate = dateFilter.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
          return auth.date === formattedDate;
        })
      : authorizations;

    if (!searchTerm) {
      return dateFiltered;
    }

    const lowercasedSearch = searchTerm.toLowerCase();

    return dateFiltered.filter(auth => {
      return (
        auth.beneficiary?.toLowerCase().includes(lowercasedSearch) ||
        auth.title?.toLowerCase().includes(lowercasedSearch) ||
        auth.id.toString().includes(lowercasedSearch) ||
        // --- SOLUCIÓN: Convertimos el CUIL a string con .toString() antes de buscar ---
        auth.details?.beneficiaryData?.cuil?.toString().includes(lowercasedSearch)
      );
    });

  }, [authorizations, dateFilter, searchTerm]);

  if (loading) return <p className="text-center text-gray-500 py-10">Cargando autorizaciones...</p>;
  if (error) return <p className="text-center text-red-500 py-10">Error: {error}</p>;

  const groupedByStatus = filteredAuthorizations.reduce((acc, auth) => {
    const status = auth.status || 'Sin Estado';
    if (!acc[status]) acc[status] = [];
    acc[status].push(auth);
    return acc;
  }, {});
  
  const columnOrder = ["Nuevas Solicitudes", "En Auditoría", "Autorizadas", "Rechazadas"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columnOrder.map(columnName => (
        <KanbanColumn
          key={columnName}
          title={columnName}
          cards={groupedByStatus[columnName] || []}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}