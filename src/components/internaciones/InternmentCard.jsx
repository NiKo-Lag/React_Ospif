// src/components/internaciones/InternmentCard.jsx

import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

export default function InternmentCard({ request, onViewDetails }) {
  const typeColor = 'bg-red-100 text-red-800';

  // --- CORRECCIÓN: Se eliminó la clase 'h-full' ---
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-red-300 hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${typeColor}`}>
            Internación
          </span>
          <span className="text-xs text-gray-500">{request.date}</span>
        </div>
        <p className="font-bold text-gray-800 mt-2 truncate" title={request.title}>{request.title || 'Sin Motivo'}</p>
        <p className="text-sm text-gray-600 mb-3">{request.beneficiary || 'Sin Beneficiario'}</p>

        {request.provider_name && (
          <div className="mt-3 pt-3 border-t border-gray-200/80 space-y-2">
            <div className="flex items-center text-xs text-gray-700">
              <BuildingOffice2Icon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <span className="font-medium truncate" title={request.provider_name}>{request.provider_name}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500">ID: {request.id}</span>
        <button 
          onClick={() => onViewDetails(request)}
          className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md font-semibold text-gray-700"
        >
          Ver Detalle
        </button>
      </div>
    </div>
  );
}
