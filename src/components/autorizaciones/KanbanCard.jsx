// src/components/autorizaciones/KanbanCard.jsx

import { StarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { BuildingOffice2Icon, BeakerIcon, UserIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function KanbanCard({ auth, onViewDetails }) {
  // --- Lógica de Estilo Condicional ---
  // Se determina el color y el texto de la etiqueta según el tipo de solicitud.
  let tagColor, borderColor;

  if (auth.requestType === 'internment') {
    // Estilos para Internaciones (Rojo Pastel)
    tagColor = 'bg-red-50 text-red-700';
    borderColor = 'border-red-300';
  } else if (auth.requestType === 'medication') {
    // Estilos para Medicación (Púrpura Pastel)
    tagColor = 'bg-purple-50 text-purple-700';
    borderColor = 'border-purple-300';
  } else {
    // Estilos por defecto para Prácticas Médicas (Celeste Pastel)
    tagColor = 'bg-blue-50 text-blue-700';
    borderColor = 'border-blue-300';
  }

  // Función para renderizar información específica según el tipo de solicitud
  const renderSpecificInfo = () => {
    if (auth.requestType === 'medication') {
      return (
        <div className="mt-3 pt-3 border-t border-gray-200/80 space-y-2">
          {/* Información específica de medicación */}
          {auth.items_count && (
            <div className="flex items-center text-xs text-gray-700">
              <BeakerIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <span className="font-medium">{auth.items_count} items</span>
            </div>
          )}
          {auth.total_quotations_count && auth.completed_quotations_count && (
            <div className="flex items-center text-xs text-gray-700">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <span className="font-medium">
                {auth.completed_quotations_count}/{auth.total_quotations_count} cotizaciones
              </span>
            </div>
          )}
          {/* Información de alto coste */}
          {(auth.high_cost || auth.isHighCost) && (
            <div className="flex items-center text-xs text-red-700">
              <ExclamationTriangleIcon className="w-4 h-4 mr-2 text-red-400 flex-shrink-0" />
              <span className="font-medium">Alto Coste</span>
            </div>
          )}
          {/* Estado de cotización para alto coste */}
          {(auth.high_cost || auth.isHighCost) && auth.quotation_status && (
            <div className="flex items-center text-xs text-gray-700">
              <ClockIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <span className="font-medium">
                {auth.quotation_status === 'sent' ? 'En Cotización' :
                 auth.quotation_status === 'pending' ? 'Pendiente' :
                 auth.quotation_status}
              </span>
            </div>
          )}
        </div>
      );
    }

    // Para prácticas médicas e internaciones, mantener la información actual
    if (auth.provider_name || auth.auditor_name) {
      return (
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
      );
    }

    return null;
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${borderColor} hover:shadow-md flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-start">
          {/* La etiqueta ahora es dinámica tanto en color como en texto */}
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${tagColor}`}>
            {auth.type} 
          </span>
          <div className="flex items-center space-x-2">
            {auth.isImportant && <StarIcon className="w-4 h-4 text-yellow-500" title="Importante" />}
            <span className="text-xs text-gray-500">{auth.date}</span>
          </div>
        </div>
        <p className="font-bold text-gray-800 mt-2">{auth.title || 'Sin Título'}</p>
        <p className="text-sm text-gray-600 mb-3">{auth.beneficiary || 'Sin Beneficiario'}</p>

        {renderSpecificInfo()}
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
