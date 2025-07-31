'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  EyeIcon,
  PlusIcon,
  UserIcon,
  CalendarIcon,
  ClipboardDocumentIcon,
  CurrencyDollarIcon,
  ShareIcon,
  PrinterIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';
import SendToQuotationForm from './SendToQuotationForm';
import Timeline from '../internaciones/Timeline';
import toast from 'react-hot-toast';

const DetailField = ({ icon: Icon, label, value, isLoading = false }) => (
  <div>
    <dt className="text-sm font-medium text-gray-500 flex items-center">
      <Icon className="w-5 h-5 mr-2 text-gray-400" />
      <span>{label}</span>
    </dt>
    <dd className="mt-1 text-sm text-gray-900 pl-7">
      {isLoading ? <span className="italic text-gray-400">Calculando...</span> : (value || '-')}
    </dd>
  </div>
);

const ActionButton = ({ onClick, children, icon: Icon, disabled }) => (
  <button
    onClick={onClick}
    className="flex items-center space-x-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
    disabled={disabled}
  >
    <Icon className="w-5 h-5" />
    <span>{children}</span>
  </button>
);

const StatusBadge = ({ status }) => {
  const statusStyles = {
    'Creada': 'bg-gray-100 text-gray-800',
    'En Cotización': 'bg-blue-100 text-blue-800',
    'Pendiente de Revisión': 'bg-yellow-100 text-yellow-800',
    'Autorizada': 'bg-green-100 text-green-800',
    'Rechazada': 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-800',
  };
  const style = statusStyles[status] || statusStyles.default;
  return <span className={`px-3 py-1 text-sm font-semibold rounded-full ${style}`}>{status}</span>;
};

export default function MedicationDetailModal({ request, onClose, onSuccess }) {
  const { data: session } = useSession();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQuotationsModal, setShowQuotationsModal] = useState(false);
  const [showSendToQuotationModal, setShowSendToQuotationModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (request?.id) {
      fetchOrderDetails();
    }
  }, [request?.id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/medication-orders/${request.id}/quotations`);
      if (!response.ok) {
        throw new Error('Error al cargar los detalles de la orden');
      }
      const data = await response.json();
      setOrderDetails(data);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToQuotation = () => {
    setShowSendToQuotationModal(true);
  };

  const handleSendToQuotationSuccess = () => {
    setShowSendToQuotationModal(false);
    fetchOrderDetails();
    if (onSuccess) onSuccess();
    toast.success('Orden enviada a cotización exitosamente');
  };

  const handleShare = async () => {
    if (!orderDetails) return;
    
    setIsSharing(true);
    try {
      const response = await fetch(`/api/medication-orders/${request.id}/share`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Error al generar enlace de compartir');
      }
      
      const { shareUrl } = await response.json();
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Enlace copiado al portapapeles');
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Error al generar enlace de compartir');
    } finally {
      setIsSharing(false);
    }
  };

  // Generar eventos de timeline
  const timelineEvents = useMemo(() => {
    if (!orderDetails) return [];
    
    const events = [
      {
        id: 1,
        type: 'created',
        title: 'Orden Creada',
        description: `Orden de medicación creada por ${orderDetails.order.created_by_name}`,
        timestamp: new Date(orderDetails.order.created_at),
        icon: PlusIcon
      }
    ];

    // Agregar evento de envío a cotización si existe
    if (orderDetails.order.quotation_status === 'sent') {
      events.push({
        id: 2,
        type: 'quotation',
        title: 'Enviada a Cotización',
        description: `Enviada a ${orderDetails.statistics.totalQuotations} farmacias`,
        timestamp: new Date(orderDetails.order.sent_to_quotation_at || orderDetails.order.created_at),
        icon: PaperAirplaneIcon
      });
    }

    // Agregar evento de autorización si existe
    if (orderDetails.order.status === 'Autorizada') {
      events.push({
        id: 3,
        type: 'authorized',
        title: 'Autorizada',
        description: 'Orden autorizada por auditor',
        timestamp: new Date(orderDetails.order.authorized_at),
        icon: CheckCircleIcon
      });
    }

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [orderDetails]);

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} size="4xl">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal isOpen={true} onClose={onClose} size="4xl">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75">
        <div className="w-full max-w-7xl h-[95vh] flex flex-col bg-gray-50 rounded-xl shadow-2xl">
          <header className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-white rounded-t-xl">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-800">Detalle de Medicación: #{request.id}</h2>
              {orderDetails && <StatusBadge status={orderDetails.order.status} />}
            </div>
            <div className="flex items-center space-x-2">
              <button 
                type="button" 
                onClick={handleShare} 
                disabled={isSharing} 
                className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-50"
              >
                {isSharing ? (
                  <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <ShareIcon className="h-6 w-6" />
                )}
              </button>
              <button 
                type="button" 
                onClick={() => toast.error('Función de impresión no implementada.')} 
                className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <PrinterIcon className="h-6 w-6" />
              </button>
              <button 
                type="button" 
                onClick={onClose} 
                className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </header>

          <div className="flex-grow flex overflow-hidden">
            {/* Columna izquierda para documentación */}
            <aside className="w-80 bg-white border-r p-4 overflow-y-auto flex-shrink-0">
              <div className="flex justify-between items-center mb-3 px-2">
                <h3 className="font-semibold text-lg text-gray-800">Documentación Adjunta</h3>
                <ActionButton onClick={() => toast.error('Función de adjuntar no implementada.')} icon={PlusCircleIcon}>
                  Adjuntar
                </ActionButton>
              </div>
              <p className="text-sm text-gray-500 text-center mt-4">No hay documentación adjunta.</p>
            </aside>

            {/* Columna central de información */}
            <main className="flex-grow p-6 space-y-6 overflow-y-auto min-w-0">
              {orderDetails && (
                <>
                  <section className="p-4 border rounded-lg bg-white">
                    <h3 className="font-semibold text-lg mb-4 text-gray-800">Información General</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      <DetailField icon={UserIcon} label="Beneficiario" value={orderDetails.order.beneficiary_name} />
                      <DetailField icon={CalendarIcon} label="Fecha de Creación" value={new Date(orderDetails.order.created_at).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })} />
                      <DetailField icon={ClipboardDocumentIcon} label="Diagnóstico" value={orderDetails.order.diagnosis} />
                      <DetailField icon={UserIcon} label="Médico Solicitante" value={orderDetails.order.requesting_doctor} />
                      <DetailField icon={ClockIcon} label="Nivel de Urgencia" value={orderDetails.order.urgency_level} />
                      <DetailField icon={CurrencyDollarIcon} label="Tipo de Medicación" value={orderDetails.order.high_cost ? 'Alto Coste' : 'Normal'} />
                    </dl>
                  </section>

                  {/* SECCIÓN DE MEDICAMENTOS */}
                  <section className="p-4 border rounded-lg bg-white">
                    <h3 className="font-semibold text-lg mb-4 text-gray-800">Medicamentos</h3>
                    {orderDetails.items && orderDetails.items.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {orderDetails.items.map((item, index) => (
                          <li key={item.id || index} className="py-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-grow">
                                <p className="text-sm font-medium text-gray-900">{item.medication_name}</p>
                                <p className="text-sm text-gray-500">
                                  {item.dosage} - {item.quantity} {item.unit}
                                </p>
                                {item.special_instructions && (
                                  <p className="text-xs text-gray-600 mt-1">{item.special_instructions}</p>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-gray-600">Prioridad {item.priority}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No hay medicamentos registrados.</p>
                    )}
                  </section>

                  {/* SECCIÓN DE COTIZACIONES */}
                  <section className="p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-lg text-gray-800">Cotizaciones</h3>
                      {(orderDetails.order.high_cost || orderDetails.order.isHighCost) && 
                       orderDetails.order.status === 'Creada' && (
                        <ActionButton onClick={handleSendToQuotation} icon={PaperAirplaneIcon}>
                          Enviar a Cotización
                        </ActionButton>
                      )}
                    </div>
                    
                    {orderDetails.statistics.totalQuotations > 0 ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total de cotizaciones:</span>
                          <span className="font-medium">{orderDetails.statistics.totalQuotations}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Completadas:</span>
                          <span className="font-medium">{orderDetails.statistics.completedQuotations}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tasa de completitud:</span>
                          <span className="font-medium">{orderDetails.statistics.completionRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No hay cotizaciones registradas.</p>
                    )}
                  </section>

                  {/* SECCIÓN DE OBSERVACIONES */}
                  <section className="p-4 border rounded-lg bg-white">
                    <h3 className="font-semibold text-lg mb-4 text-gray-800">Observaciones</h3>
                    {orderDetails.order.special_observations ? (
                      <p className="text-sm text-gray-700">{orderDetails.order.special_observations}</p>
                    ) : (
                      <p className="text-sm text-gray-500">No hay observaciones especiales.</p>
                    )}
                  </section>
                </>
              )}
            </main>

            {/* Columna derecha para la línea de tiempo */}
            <aside className="w-80 bg-white border-l p-6 overflow-y-auto flex-shrink-0">
              <h3 className="font-semibold text-lg mb-4 text-gray-800">Trazabilidad</h3>
              {loading ? (
                <p className="text-center text-gray-500 text-sm">Cargando...</p>
              ) : (
                <Timeline events={timelineEvents} />
              )}
            </aside>
          </div>
        </div>
      </div>

      {/* Send to Quotation Modal */}
      <Modal isOpen={showSendToQuotationModal} onClose={() => setShowSendToQuotationModal(false)} size="4xl">
        <SendToQuotationForm
          order={orderDetails}
          onSuccess={handleSendToQuotationSuccess}
          onCancel={() => setShowSendToQuotationModal(false)}
        />
      </Modal>
    </>
  );
} 