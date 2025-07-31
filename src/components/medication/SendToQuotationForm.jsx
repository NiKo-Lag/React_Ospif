'use client';

import { useState, useEffect } from 'react';
import { 
  ExclamationCircleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function SendToQuotationForm({ order, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacies, setSelectedPharmacies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingPharmacies, setLoadingPharmacies] = useState(true);

  // Fetch pharmacies
  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        setLoadingPharmacies(true);
        const response = await fetch('/api/pharmacies?isActive=true');
        if (!response.ok) {
          throw new Error('Error al cargar las droguerías');
        }
        const data = await response.json();
        setPharmacies(data.pharmacies);
      } catch (error) {
        console.error('Error fetching pharmacies:', error);
        setError('Error al cargar las droguerías');
      } finally {
        setLoadingPharmacies(false);
      }
    };

    fetchPharmacies();
  }, []);

  // Filter pharmacies based on search
  const filteredPharmacies = pharmacies.filter(pharmacy =>
    pharmacy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pharmacy.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pharmacy.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle pharmacy selection
  const handlePharmacyToggle = (pharmacyId) => {
    setSelectedPharmacies(prev => {
      if (prev.includes(pharmacyId)) {
        return prev.filter(id => id !== pharmacyId);
      } else {
        return [...prev, pharmacyId];
      }
    });
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedPharmacies.length === filteredPharmacies.length) {
      setSelectedPharmacies([]);
    } else {
      setSelectedPharmacies(filteredPharmacies.map(p => p.id));
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (selectedPharmacies.length === 0) {
      setError('Debe seleccionar al menos una droguería');
      return;
    }

    // Verificar si es medicación de alto coste
    const isHighCost = order.high_cost || order.isHighCost;
    
    if (isHighCost && selectedPharmacies.length < 3) {
      setError('Para medicaciones de alto coste se requieren al menos 3 farmacias');
      return;
    }

    if (!isHighCost && selectedPharmacies.length < 2) {
      setError('Se recomienda seleccionar al menos 2 droguerías para obtener mejores cotizaciones');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/medication-orders/${order.id}/send-to-quotation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pharmacyIds: selectedPharmacies
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar la orden a cotización');
      }

      const result = await response.json();
      onSuccess(result);
    } catch (error) {
      console.error('Error sending to quotation:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated quotations
  const estimatedQuotations = order.items_count * selectedPharmacies.length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Enviar Orden a Cotización
        </h2>
        <p className="text-gray-600">
          Seleccione las droguerías a las que desea enviar la orden para cotización.
        </p>
      </div>

      {/* Order summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Resumen de la Orden</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Orden #:</span> {order.id}
          </div>
          <div>
            <span className="font-medium">Beneficiario:</span> {order.beneficiaryName}
          </div>
          <div>
            <span className="font-medium">Items:</span> {order.items_count}
          </div>
          <div>
            <span className="font-medium">Urgencia:</span> {order.urgencyLevel}
          </div>
          <div>
            <span className="font-medium">Tipo:</span> 
            <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
              (order.high_cost || order.isHighCost) 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {(order.high_cost || order.isHighCost) ? 'Alto Coste' : 'Normal'}
            </span>
          </div>
          {(order.high_cost || order.isHighCost) && (
            <div>
              <span className="font-medium">Farmacias Mínimas:</span> 
              <span className="ml-1 font-bold text-red-600">3</span>
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Pharmacy selection */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Seleccionar Droguerías</h3>
          <div className="text-sm text-gray-600">
            {selectedPharmacies.length} de {pharmacies.length} seleccionadas
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar droguerías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Select all/none */}
        {filteredPharmacies.length > 0 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedPharmacies.length === filteredPharmacies.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
          </div>
        )}

        {/* Pharmacies list */}
        {loadingPharmacies ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPharmacies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm ? 'No se encontraron droguerías con ese criterio de búsqueda.' : 'No hay droguerías disponibles.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPharmacies.map((pharmacy) => (
              <div
                key={pharmacy.id}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedPharmacies.includes(pharmacy.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handlePharmacyToggle(pharmacy.id)}
              >
                <div className="flex items-center h-4 w-4 mr-3">
                  <input
                    type="checkbox"
                    checked={selectedPharmacies.includes(pharmacy.id)}
                    onChange={() => handlePharmacyToggle(pharmacy.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{pharmacy.name}</div>
                  <div className="text-sm text-gray-600">
                    {pharmacy.contactPerson} • {pharmacy.email}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Tasa de éxito: {pharmacy.success_rate}% • {pharmacy.total_quotations} cotizaciones
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedPharmacies.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Resumen de Cotizaciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Droguerías seleccionadas:</span> {selectedPharmacies.length}
            </div>
            <div>
              <span className="font-medium">Items en la orden:</span> {order.items_count}
            </div>
            <div>
              <span className="font-medium">Cotizaciones estimadas:</span> {estimatedQuotations}
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-white rounded border">
            <h4 className="font-medium text-gray-900 mb-2">Proceso que se ejecutará:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Se crearán {estimatedQuotations} registros de cotización</li>
              <li>• Se enviarán emails automáticos a {selectedPharmacies.length} droguerías</li>
              <li>• Cada droguería recibirá un link único para completar su cotización</li>
              <li>• El estado de la orden cambiará a "En Cotización"</li>
              {(order.high_cost || order.isHighCost) && (
                <>
                  <li>• <strong>Control de tiempo de 48 horas</strong> para completar cotizaciones</li>
                  <li>• <strong>Re-notificación automática</strong> si no responden todas las farmacias</li>
                  <li>• <strong>Selección de nuevas farmacias</strong> si expira el tiempo límite</li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || selectedPharmacies.length === 0}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enviando...
            </div>
          ) : (
            `Enviar a ${selectedPharmacies.length} Droguería${selectedPharmacies.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );
} 