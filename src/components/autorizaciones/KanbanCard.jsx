// app/components/autorizaciones/KanbanCard.jsx

import { StarIcon } from '@heroicons/react/24/solid';

export default function KanbanCard({ auth }) {
  const typeColors = {
    'Práctica Médica': 'bg-blue-100 text-blue-800',
    'Internación': 'bg-red-100 text-red-800',
    'Medicamento': 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 hover:shadow-md cursor-pointer">
      <div className="flex justify-between items-start">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${typeColors[auth.type] || 'bg-gray-100'}`}>
          {auth.type}
        </span>
        <div className="flex items-center space-x-2">
          {auth.isImportant && <StarIcon className="w-4 h-4 text-yellow-500" title="Importante" />}
          <span className="text-xs text-gray-500">{auth.date}</span>
        </div>
      </div>
      <p className="font-bold text-gray-800 mt-2">{auth.title || 'Sin Título'}</p>
      <p className="text-sm text-gray-600">{auth.beneficiary || 'Sin Beneficiario'}</p>
      <div className="mt-3 pt-3 border-t flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500">{auth.id}</span>
        <button className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md">
          Ver Detalle
        </button>
      </div>
    </div>
  );
}