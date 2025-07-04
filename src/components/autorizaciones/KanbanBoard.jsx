// src/components/autorizaciones/KanbanBoard.jsx

"use client";

import { useMemo } from "react";
import KanbanColumn from "./KanbanColumn";

// Recibe los datos y filtros como props
export default function KanbanBoard({ authorizations, loading, error, dateFilter, searchTerm }) {

  const filteredAuthorizations = useMemo(() => {
    if (!dateFilter) return [];

    const formattedDate = dateFilter.toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    
    const lowercasedSearch = searchTerm.toLowerCase();

    return authorizations.filter(auth => {
      const dateMatch = auth.date === formattedDate;
      const searchMatch = lowercasedSearch === '' ||
        auth.beneficiary?.toLowerCase().includes(lowercasedSearch) ||
        auth.title?.toLowerCase().includes(lowercasedSearch) ||
        auth.id.toString().includes(lowercasedSearch);
      
      return dateMatch && searchMatch;
    });
  }, [authorizations, dateFilter, searchTerm]);

  if (loading) {
    return <p className="text-center text-gray-500">Cargando autorizaciones...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">Error: {error}</p>;
  }

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
        />
      ))}
    </div>
  );
}