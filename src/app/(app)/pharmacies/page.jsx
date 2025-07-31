'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';

export default function PharmaciesPage() {
  const { data: session } = useSession();
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    isActive: '',
    search: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);

  // Fetch pharmacies
  const fetchPharmacies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.isActive !== '' && { isActive: filters.isActive }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`/api/pharmacies?${params}`);
      if (!response.ok) {
        throw new Error('Error al cargar las droguerías');
      }

      const data = await response.json();
      setPharmacies(data.pharmacies);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacies();
  }, [pagination.page, filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Handle view details
  const handleViewDetails = async (pharmacyId) => {
    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}`);
      if (!response.ok) {
        throw new Error('Error al cargar los detalles de la droguería');
      }
      const data = await response.json();
      setSelectedPharmacy(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching pharmacy details:', error);
      setError(error.message);
    }
  };

  // Handle delete pharmacy
  const handleDeletePharmacy = async (pharmacyId) => {
    if (!confirm('¿Está seguro de que desea desactivar esta droguería? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al desactivar la droguería');
      }

      // Refresh the list
      fetchPharmacies();
    } catch (error) {
      console.error('Error deleting pharmacy:', error);
      setError(error.message);
    }
  };

  // Handle create success
  const handleCreateSuccess = (newPharmacy) => {
    setShowCreateModal(false);
    fetchPharmacies();
  };

  // Handle edit success
  const handleEditSuccess = (updatedPharmacy) => {
    setShowEditModal(false);
    setSelectedPharmacy(null);
    fetchPharmacies();
  };

  if (loading && pharmacies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Droguerías</h1>
          <p className="text-gray-600 mt-2">Gestiona el catálogo de droguerías para cotizaciones</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Nueva Droguería
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar droguerías..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.isActive}
              onChange={(e) => handleFilterChange('isActive', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-end text-sm text-gray-600">
            {pagination.total} droguerías encontradas
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Pharmacies Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Droguería
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rendimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Actividad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pharmacies.map((pharmacy) => (
                <tr key={pharmacy.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{pharmacy.name}</div>
                    <div className="text-sm text-gray-500">{pharmacy.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{pharmacy.contactPerson}</div>
                    <div className="text-sm text-gray-500">{pharmacy.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {pharmacy.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircleIcon className="w-3 h-3 mr-1" />
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {pharmacy.total_quotations} cotizaciones
                    </div>
                    <div className="text-sm text-gray-500">
                      {pharmacy.success_rate}% de éxito
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(pharmacy.updatedAt).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewDetails(pharmacy.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {pharmacy.isActive && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPharmacy(pharmacy);
                              setShowEditModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Editar"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePharmacy(pharmacy.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Desactivar"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {pharmacies.length === 0 && !loading && (
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron droguerías</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.isActive !== '' || filters.search 
                ? 'Intenta ajustar los filtros de búsqueda.'
                : 'Comienza creando una nueva droguería.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando{' '}
                <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                {' '}a{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>
                {' '}de{' '}
                <span className="font-medium">{pagination.total}</span>
                {' '}resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === pagination.page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Create Pharmacy Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="2xl">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Nueva Droguería</h2>
          <p className="text-gray-600 mb-6">
            Formulario para crear una nueva droguería en el sistema.
          </p>
          {/* TODO: Implement create pharmacy form */}
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-600">Formulario de creación en desarrollo...</p>
          </div>
        </div>
      </Modal>

      {/* Edit Pharmacy Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} size="2xl">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Editar Droguería</h2>
          <p className="text-gray-600 mb-6">
            Modificar los datos de la droguería seleccionada.
          </p>
          {/* TODO: Implement edit pharmacy form */}
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-600">Formulario de edición en desarrollo...</p>
          </div>
        </div>
      </Modal>

      {/* Pharmacy Details Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} size="4xl">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Detalles de la Droguería
          </h2>
          {selectedPharmacy && (
            <div className="space-y-6">
              {/* Pharmacy info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Nombre:</span> {selectedPharmacy.pharmacy.name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedPharmacy.pharmacy.email}
                  </div>
                  <div>
                    <span className="font-medium">Contacto:</span> {selectedPharmacy.pharmacy.contactPerson}
                  </div>
                  <div>
                    <span className="font-medium">Teléfono:</span> {selectedPharmacy.pharmacy.phone || 'No especificado'}
                  </div>
                  <div>
                    <span className="font-medium">Dirección:</span> {selectedPharmacy.pharmacy.address || 'No especificada'}
                  </div>
                  <div>
                    <span className="font-medium">Estado:</span> 
                    {selectedPharmacy.pharmacy.isActive ? ' Activa' : ' Inactiva'}
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Estadísticas de Rendimiento</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total cotizaciones:</span> {selectedPharmacy.statistics.totalQuotations}
                  </div>
                  <div>
                    <span className="font-medium">Autorizadas:</span> {selectedPharmacy.statistics.authorizedQuotations}
                  </div>
                  <div>
                    <span className="font-medium">Pendientes:</span> {selectedPharmacy.statistics.pendingQuotations}
                  </div>
                  <div>
                    <span className="font-medium">Tasa de éxito:</span> {selectedPharmacy.statistics.successRate}%
                  </div>
                </div>
              </div>

              {/* Recent quotations */}
              {selectedPharmacy.recentQuotations.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Cotizaciones Recientes</h3>
                  <div className="space-y-2">
                    {selectedPharmacy.recentQuotations.map((quotation) => (
                      <div key={quotation.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{quotation.medicationName} - {quotation.dosage}</div>
                            <div className="text-sm text-gray-600">
                              Orden #{quotation.order_id} • {quotation.beneficiaryName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              quotation.status === 'Autorizada' ? 'bg-green-100 text-green-800' :
                              quotation.status === 'Cotizada' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {quotation.status}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              ${quotation.totalPrice}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
} 