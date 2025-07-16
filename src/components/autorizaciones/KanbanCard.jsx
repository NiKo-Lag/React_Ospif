// src/components/autorizaciones/KanbanCard.jsx

import { StarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

export default function KanbanCard({ auth, onViewDetails }) {
  // Se definen los colores específicos para esta tarjeta para asegurar consistencia.
  const tagColor = 'bg-blue-100 text-blue-800';
  const borderColor = 'border-blue-300';

  return (
    // --- CORRECCIÓN: Se añade un borde izquierdo con color y se quita el borde genérico ---
    <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${borderColor} hover:shadow-md flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-start">
          {/* --- CORRECCIÓN: Se aplica el color celeste pastel directamente --- */}
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${tagColor}`}>
            Práctica Médica
          </span>
          <div className="flex items-center space-x-2">
            {auth.isImportant && <StarIcon className="w-4 h-4 text-yellow-500" title="Importante" />}
            <span className="text-xs text-gray-500">{auth.date}</span>
          </div>
        </div>
        <p className="font-bold text-gray-800 mt-2">{auth.title || 'Sin Título'}</p>
        <p className="text-sm text-gray-600 mb-3">{auth.beneficiary || 'Sin Beneficiario'}</p>

        {(auth.provider_name || auth.auditor_name) && (
          <div className="mt-3 pt-3 border-t border-gray-200/80 space-y-2">
            {auth.provider_name && (
              <div className="flex items-center text-xs text-gray-700">
                <BuildingOffice2Icon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="font-medium truncate" title={auth.provider_name}>{auth.provider_name}</span>
              </div>
            )}
            {auth.auditor_name && (
              <div className="flex items-center text-xs text-gray-700">
                <CheckCircleIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="font-medium">{auth.auditor_name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500">ID: {auth.id}</span>
        <button 
          onClick={() => onViewDetails(auth)}
          className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md font-semibold text-gray-700"
        >
          Ver Detalle
        </button>
      </div>
    </div>
  );
}
