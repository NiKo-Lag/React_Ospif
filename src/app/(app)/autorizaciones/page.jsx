"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, ChevronDownIcon, ViewColumnsIcon, Bars3Icon, PlusIcon } from '@heroicons/react/24/solid';
import { 
  MagnifyingGlassIcon,
  FunnelIcon, 
  EyeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import KanbanBoard from '@/components/autorizaciones/KanbanBoard';
import AuthorizationList from '@/components/autorizaciones/AuthorizationList';
import Modal from '@/components/ui/Modal';
import AuthorizationForm from '@/components/autorizaciones/AuthorizationForm';
import HistoryModal from '@/components/autorizaciones/HistoryModal';
import InternmentNotificationWizard from '@/components/internaciones/InternmentNotificationWizard';
import InternmentDetailModal from '@/components/internaciones/InternmentDetailModal';
import MedicationDetailModal from '@/components/medication/MedicationDetailModal';
import CreateOrderForm from '@/components/medication/CreateOrderForm';
import HighCostAlerts from '@/components/medication/HighCostAlerts';
import toast, { Toaster } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
};

const HeaderButton = ({ children, onClick, title }) => (
  <button onClick={onClick} title={title} className="p-2 rounded-md hover:bg-gray-100 transition-colors">{children}</button>
);

const ALL_KANBAN_COLUMNS = [
  { title: 'Nuevas Solicitudes', status: 'Nuevas Solicitudes' },
  { title: 'En Auditoría', status: 'En Auditoría' },
  { title: 'Requiere Corrección', status: 'Requiere Corrección' },
  { title: 'Autorizadas', status: 'Autorizada' },
  { title: 'Rechazadas', status: 'Rechazada' },
];

export default function AutorizacionesPage() {
  console.log('[DEBUG-AUTORIZACIONES] Componente iniciando...');
  
  const [viewMode, setViewMode] = useState('kanban');
  const [activeTab, setActiveTab] = useState('practice');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: session } = useSession();
  
  console.log('[DEBUG-AUTORIZACIONES] Estados iniciales:', { viewMode, activeTab, loading, error, session: !!session });
  
  const [authFormModalState, setAuthFormModalState] = useState({ 
    isOpen: false, mode: 'new', data: null, internmentId: null, initialBeneficiary: null 
  });
  
  const [internmentFormModalOpen, setInternmentFormModalOpen] = useState(false);
  const [internmentDetailModalState, setInternmentDetailModalState] = useState({ isOpen: false, request: null });
  const [medicationDetailModalState, setMedicationDetailModalState] = useState({ isOpen: false, request: null });
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Estados para filtros
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    cuil: ''
  });
  const [activeFilters, setActiveFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    cuil: ''
  });

  const fetchData = useCallback(async (filters = {}) => {
    console.log('[DEBUG-AUTORIZACIONES] fetchData llamado con filtros:', filters);
    console.log('[DEBUG-AUTORIZACIONES] session:', session);
    
    if (!session) {
      console.log('[DEBUG-AUTORIZACIONES] No hay sesión, retornando');
      return;
    }

    console.log('[DEBUG-AUTORIZACIONES] Iniciando fetchData...');
    setLoading(true);
    
    // Unificamos el endpoint para todos los roles internos.
    // Este endpoint ya devuelve los datos correctos y combinados para el tablero.
    const endpoint = '/api/autorizaciones/internas';

    // Construir parámetros de filtro
    const params = new URLSearchParams();
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.status) params.append('status', filters.status);
    if (filters.cuil) params.append('cuil', filters.cuil);

    const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

    try {
      console.log(`[DEBUG-AUTORIZACIONES] Intentando realizar fetch a la URL: ${url}`);
      const response = await fetch(url);
      console.log(`[DEBUG-AUTORIZACIONES] Respuesta recibida:`, { status: response.status, statusText: response.statusText });
      
      if (!response.ok) {
        console.error(`[DEBUG-AUTORIZACIONES] La respuesta del servidor no fue OK. Status: ${response.status}, StatusText: ${response.statusText}`);
        throw new Error('No se pudo obtener la información de las autorizaciones.');
      }
      
      const data = await response.json();
      console.log(`[DEBUG-AUTORIZACIONES] Datos recibidos:`, data);
      
      const formattedData = data.map(item => {
        let requestType = 'unknown';
        if (item.type === 'Práctica Médica') {
          requestType = 'practice';
        } else if (item.type === 'Internación') {
          requestType = 'internment';
        } else if (item.type === 'Medicación') {
          requestType = 'medication';
        }

        return {
          ...item,
          requestType,
          beneficiary: item.beneficiary, 
          provider: item.provider_name,
          date: item.date, 
        };
      });

      setRequests(formattedData);
      console.log('[DEBUG-AUTORIZACIONES] Datos establecidos correctamente:', formattedData.length, 'elementos');
    } catch (err) {
      console.error("[DEBUG-AUTORIZACIONES] Error capturado en el bloque catch de fetchData:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
      console.log('[DEBUG-AUTORIZACIONES] fetchData completado, loading:', false);
    }
  }, [session]);

  useEffect(() => { 
    console.log('[DEBUG-AUTORIZACIONES] useEffect inicial ejecutándose, session:', !!session);
    if (session) {
      console.log('[DEBUG-AUTORIZACIONES] Llamando fetchData desde useEffect inicial');
      fetchData({}); 
    }
  }, [fetchData, session]);

  // Efecto para cuando cambien los filtros activos
  useEffect(() => {
    console.log('[DEBUG-AUTORIZACIONES] useEffect de filtros ejecutándose, activeFilters:', activeFilters);
    if (session) {
      console.log('[DEBUG-AUTORIZACIONES] Llamando fetchData desde useEffect de filtros');
      fetchData(activeFilters);
    }
  }, [activeFilters, session, fetchData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNewRequestOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [dropdownRef]);

  const displayedRequests = useMemo(() => {
    if (activeTab === 'practice') return requests.filter(r => r.requestType === 'practice');
    if (activeTab === 'internment') return requests.filter(r => r.requestType === 'internment');
    if (activeTab === 'medication') return requests.filter(r => r.requestType === 'medication');
    return requests;
  }, [requests, activeTab]);

  const displayedColumns = useMemo(() => {
    let columns = [...ALL_KANBAN_COLUMNS];
    
    if (session?.user?.role === 'auditor') {
      columns = columns.filter(col => col.status !== 'Nuevas Solicitudes');
    }

    return columns;
  }, [requests, session]);

  const handleViewDetails = (request) => {
    if (request.requestType === 'internment') {
      setInternmentDetailModalState({ isOpen: true, request: request });
    } else if (request.requestType === 'medication') {
      setMedicationDetailModalState({ isOpen: true, request: request });
    } else {
      setAuthFormModalState({ isOpen: true, mode: 'view', data: request, internmentId: null, initialBeneficiary: null });
    }
  };

  const handleOpenAuthForm = () => {
    setAuthFormModalState({ isOpen: true, mode: 'new', data: null, internmentId: null, initialBeneficiary: null });
    setIsNewRequestOpen(false);
  };

  const handleCloseAuthForm = () => setAuthFormModalState({ isOpen: false, mode: 'new', data: null, internmentId: null, initialBeneficiary: null });

  const handleAuthFormSuccess = () => {
    handleCloseAuthForm();
    toast.success('¡Solicitud de práctica guardada!');
    fetchData(); 
  };

  const handleOpenInternmentForm = () => {
    setInternmentFormModalOpen(true);
    setIsNewRequestOpen(false);
  };
  
  const handleCloseInternmentForm = () => setInternmentFormModalOpen(false);

  const handleInternmentFormSuccess = () => {
      handleCloseInternmentForm();
      toast.success('¡Denuncia de internación guardada!');
      fetchData();
  };

  const handleMedicationFormSuccess = (newOrder) => {
    setShowMedicationModal(false);
    fetchData();
    toast.success(`Orden de medicación #${newOrder.id} creada exitosamente.`);
  };

  const handleCloseInternmentDetail = () => setInternmentDetailModalState({ isOpen: false, request: null });

  const handleAttachPractice = (internmentRequest) => {
    handleCloseInternmentDetail();
    setAuthFormModalState({
      isOpen: true,
      mode: 'new',
      data: { provider_id: internmentRequest.notifying_provider_id }, 
      internmentId: internmentRequest.id,
      initialBeneficiary: {
          cuil: internmentRequest.beneficiary_cuil,
          nombre: internmentRequest.beneficiary,
          activo: true
      }
    });
  };

  // Funciones para manejar filtros
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setActiveFilters(filters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      dateFrom: '',
      dateTo: '',
      status: '',
      cuil: ''
    };
    setFilters(emptyFilters);
    setActiveFilters(emptyFilters);
  };

  console.log('[DEBUG-AUTORIZACIONES] Renderizando componente, estados:', { 
    session: !!session, 
    loading, 
    error, 
    requestsCount: requests.length 
  });

  if (!session) {
    console.log('[DEBUG-AUTORIZACIONES] No hay sesión, mostrando mensaje');
    return <div className="flex items-center justify-center h-screen">No hay sesión activa</div>;
  }

  if (loading) {
    console.log('[DEBUG-AUTORIZACIONES] Cargando, mostrando spinner');
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  if (error) {
    console.log('[DEBUG-AUTORIZACIONES] Error detectado:', error);
    return <div className="flex items-center justify-center h-screen">Error: {error}</div>;
  }

  console.log('[DEBUG-AUTORIZACIONES] Renderizando página principal');

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-right" />
      <div className="p-4 sm:p-6">
        {/* High Cost Alerts */}
        <HighCostAlerts />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Solicitudes</h1>
            <p className="text-gray-500 mt-1">Supervisa y gestiona todas las solicitudes médicas e internaciones.</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 mt-4 md:mt-0">
            <div className="flex items-center rounded-lg bg-gray-200 p-0.5">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:bg-gray-300'}`}
                title="Vista Kanban"
              >
                <ViewColumnsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:bg-gray-300'}`}
                title="Vista de Lista"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>

            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsNewRequestOpen(prev => !prev)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm flex items-center transition-colors">
                <PlusIcon className="w-5 h-5 mr-2" />
                Nueva Solicitud
                <ChevronDownIcon className={`w-5 h-5 ml-2 transition-transform ${isNewRequestOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isNewRequestOpen && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu">
                      <a href="#" onClick={handleOpenAuthForm} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Práctica Médica</a>
                      <a href="#" onClick={handleOpenInternmentForm} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Internación</a>
                      <a href="#" onClick={() => setShowMedicationModal(true)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Medicación</a>
                      <a href="#" onClick={() => toast.error('Funcionalidad no implementada.')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Prótesis y Ortesis</a>
                      <a href="#" onClick={() => toast.error('Funcionalidad no implementada.')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Traslados</a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        
        {/* Sección de Filtros */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por fecha desde */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              {/* Filtro por fecha hasta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              {/* Filtro por estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="Nuevas Solicitudes">Nuevas Solicitudes</option>
                  <option value="En Auditoría">En Auditoría</option>
                  <option value="Requiere Corrección">Requiere Corrección</option>
                  <option value="Autorizada">Autorizada</option>
                  <option value="Rechazada">Rechazada</option>
                </select>
              </div>
              
              {/* Filtro por CUIL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIL</label>
                <input
                  type="text"
                  value={filters.cuil}
                  onChange={(e) => handleFilterChange('cuil', e.target.value)}
                  placeholder="Buscar por CUIL..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            {/* Botones de filtros */}
            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Aplicar Filtros
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
        
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('practice'); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'practice' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Prácticas Médicas</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('internment'); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'internment' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Internaciones</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('medication'); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'medication' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Medicamentos</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('prosthesis'); toast.error('Funcionalidad no implementada.') }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'prosthesis' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Prótesis y Ortesis</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('transfers'); toast.error('Funcionalidad no implementada.') }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'transfers' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Traslados</a>
          </nav>
        </div>
      </div>
      <div className="flex-grow mt-6 overflow-y-auto px-4 sm:px-6">
        {viewMode === 'kanban' ? (
          <KanbanBoard requests={displayedRequests} columns={displayedColumns} loading={loading} error={error} searchTerm={debouncedSearchTerm} onViewDetails={handleViewDetails} />
        ) : (
          <AuthorizationList requests={displayedRequests} loading={loading} error={error} onViewDetails={handleViewDetails} />
       )}
      </div>

      <Modal isOpen={authFormModalState.isOpen} onClose={handleCloseAuthForm}>
        <AuthorizationForm 
          onSuccess={handleAuthFormSuccess} 
          closeModal={handleCloseAuthForm} 
          isReadOnly={authFormModalState.mode === 'view'} 
          initialData={authFormModalState.data} 
          internmentId={authFormModalState.internmentId} 
          initialBeneficiary={authFormModalState.initialBeneficiary}
          userRole={session?.user?.role}
        />
      </Modal>
      <Modal isOpen={internmentFormModalOpen} onClose={handleCloseInternmentForm}>
          <InternmentNotificationWizard
            onSuccess={handleInternmentFormSuccess}
            closeModal={handleCloseInternmentForm}
            userRole={session?.user?.role}
          />
      </Modal>
      {internmentDetailModalState.isOpen && (
        <InternmentDetailModal 
          request={internmentDetailModalState.request} 
          onClose={handleCloseInternmentDetail} 
          onAttachPractice={handleAttachPractice} 
          onSuccess={fetchData}
        />
      )}

      {medicationDetailModalState.isOpen && (
        <MedicationDetailModal 
          request={medicationDetailModalState.request} 
          onClose={() => setMedicationDetailModalState({ isOpen: false, request: null })} 
          onSuccess={fetchData}
        />
      )}

      <Modal isOpen={showMedicationModal} onClose={() => setShowMedicationModal(false)} size="7xl">
        <CreateOrderForm 
          onSuccess={handleMedicationFormSuccess}
          onCancel={() => setShowMedicationModal(false)}
        />
      </Modal>
    </div>
  );
}
