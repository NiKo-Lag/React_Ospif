// src/components/autorizaciones/AuthorizationList.jsx
import { EyeIcon } from '@heroicons/react/24/outline';

const getStatusColor = (status) => {
  switch (status) {
    case 'Nuevas Solicitudes':
    case 'Pendiente de Auditoría':
      return 'bg-blue-100 text-blue-800';
    case 'En Auditoría':
      return 'bg-yellow-100 text-yellow-800';
    case 'Autorizadas':
    case 'Activa':
      return 'bg-green-100 text-green-800';
    case 'Rechazadas':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const AuthorizationList = ({ requests = [], loading, error, onViewDetails }) => {
  if (loading) return <p className="text-center text-gray-500 py-10">Cargando lista...</p>;
  if (error) return <p className="text-center text-red-500 py-10">Error: {error}</p>;
  if (!loading && requests.length === 0) {
    return <p className="text-center text-gray-500 py-10">No se encontraron solicitudes que coincidan con los filtros actuales.</p>;
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiario</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prestador</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{request.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate" title={request.title}>{request.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.beneficiary}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.provider_name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => onViewDetails(request)} className="text-indigo-600 hover:text-indigo-900 flex items-center">
                    <EyeIcon className="w-5 h-5 mr-1" />
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuthorizationList; 