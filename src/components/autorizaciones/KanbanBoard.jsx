// src/components/autorizaciones/KanbanBoard.jsx

import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import InternmentCard from '../internaciones/InternmentCard';

// --- NUEVO: Helper para generar la clase de la grilla de forma segura ---
const getGridColsClass = (count) => {
  switch (count) {
    case 1: return 'lg:grid-cols-1';
    case 2: return 'lg:grid-cols-2';
    case 3: return 'lg:grid-cols-3';
    case 4: return 'lg:grid-cols-4';
    case 5: return 'lg:grid-cols-5';
    default: return 'lg:grid-cols-5'; // Fallback por si acaso
  }
};

const KanbanBoard = ({ requests = [], columns = [], loading, error, searchTerm, onViewDetails }) => {
  
  const filteredRequests = searchTerm 
    ? requests.filter(request => {
        const term = searchTerm.toLowerCase();
        const titleMatch = request.title && request.title.toLowerCase().includes(term);
        const beneficiaryMatch = request.beneficiary && request.beneficiary.toLowerCase().includes(term);
        const idMatch = String(request.id).includes(term);
        return titleMatch || beneficiaryMatch || idMatch;
      })
    : requests;

  if (loading) return <p className="text-center text-gray-500">Cargando tablero...</p>;
  if (error) return <p className="text-center text-red-500">Error: {error}</p>;

  // --- CORRECCIÓN: Se usa el helper para la clase de la grilla ---
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${getGridColsClass(columns.length)} gap-6`}>
      {columns.map(column => (
        <KanbanColumn key={column.status} title={column.title}>
          {filteredRequests
            .filter(request => request.status === column.status)
            .map(request => {
              switch (request.requestType) {
                case 'internment':
                  return <InternmentCard key={request.id} request={request} onViewDetails={onViewDetails} />;
                case 'practice':
                default:
                  return <KanbanCard key={request.id} auth={request} onViewDetails={onViewDetails} />;
              }
            })}
        </KanbanColumn>
      ))}
    </div>
  );
};

export default KanbanBoard;
