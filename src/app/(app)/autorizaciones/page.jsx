// src/app/(app)/autorizaciones/page.jsx

"use client";

<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
=======
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
>>>>>>> master
import KanbanBoard from '@/components/autorizaciones/KanbanBoard';
import Modal from '@/components/ui/Modal';
import AuthorizationForm from '@/components/autorizaciones/AuthorizationForm';
import HistoryModal from '@/components/autorizaciones/HistoryModal';
<<<<<<< HEAD
import toast, { Toaster } from 'react-hot-toast';

const HeaderButton = ({ children, onClick, title }) => (
  <button onClick={onClick} title={title} className="p-2 rounded-md hover:bg-gray-100">{children}</button>
);

export default function AutorizacionesPage() {
  const [currentDate, setCurrentDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyData, setHistoryData] = useState({ isOpen: false, cuil: '', results: [] });
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado unificado para manejar el modal
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'new', // 'new' o 'view'
    data: null,
  });
=======
import InternmentForm from '@/components/internaciones/InternmentForm';
import InternmentDetailModal from '@/components/internaciones/InternmentDetailModal';
import toast, { Toaster } from 'react-hot-toast';

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
  { title: 'Activa', status: 'Activa' },
  { title: 'Autorizadas', status: 'Autorizadas' },
  { title: 'Rechazadas', status: 'Rechazadas' },
];

export default function AutorizacionesPage() {
  const [activeTab, setActiveTab] = useState('practice');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [authFormModalState, setAuthFormModalState] = useState({ 
    isOpen: false, mode: 'new', data: null, internmentId: null, initialBeneficiary: null 
  });
  
  const [internmentFormModalOpen, setInternmentFormModalOpen] = useState(false);
  const [internmentDetailModalState, setInternmentDetailModalState] = useState({ isOpen: false, request: null });
  
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const dropdownRef = useRef(null);
  const debouncedSearchTerm = useDebounce(useState('')[0], 500);
>>>>>>> master

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
<<<<<<< HEAD
      const response = await fetch('/api/autorizaciones');
      if (!response.ok) throw new Error('No se pudo obtener la información.');
      const data = await response.json();
      setAuthorizations(data);
=======
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('No se pudo obtener la información del dashboard.');
      const data = await response.json();
      setRequests(data);
>>>>>>> master
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

<<<<<<< HEAD
  useEffect(() => {
    setCurrentDate(new Date());
    fetchData();
  }, [fetchData]);

  const handleOpenNewModal = () => {
    setModalState({ isOpen: true, mode: 'new', data: null });
  };

  const handleOpenViewModal = (authData) => {
    setModalState({ isOpen: true, mode: 'view', data: authData });
  };
  
  const handleCloseModal = () => {
    setModalState({ isOpen: false, mode: 'new', data: null });
  };

  const handleFormSuccess = () => {
    handleCloseModal();
    toast.success('¡Solicitud guardada con éxito!');
    fetchData(); 
  };
  
  const handleDateChange = (days) => { setCurrentDate(prev => { if (!prev) return new Date(); const newDate = new Date(prev); newDate.setDate(newDate.getDate() + days); return newDate; }); };
  const handleSearchChange = async (value) => { setSearchTerm(value); if (/^\d{11}$/.test(value)) { try { const response = await fetch(`/api/autorizaciones/history/${value}`); const results = await response.json(); if (results.length === 0) { toast('No se encontró historial para el CUIL indicado.'); return; } setHistoryData({ isOpen: true, cuil: value, results: results }); } catch (error) { toast.error("Error al buscar el historial."); } } };

  if (!currentDate) return null;

  return (
    <div>
      <Toaster position="top-right" toastOptions={{ style: { background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: '#1f2937', border: '1px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', }, success: { iconTheme: { primary: '#16a34a', secondary: 'white' } }, error: { iconTheme: { primary: '#dc2626', secondary: 'white' } } }} />
      <div className="p-4 sm:p-6 h-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div><h1 className="text-2xl font-bold text-gray-800">Gestión de Autorizaciones</h1><p className="text-gray-500 mt-1">Supervisa y gestiona todas las solicitudes médicas.</p></div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="flex items-center space-x-2 bg-white p-1 rounded-lg shadow-sm border">
                <HeaderButton onClick={() => handleDateChange(-1)} title="Día anterior"><ChevronLeftIcon className="w-5 h-5 text-gray-600" /></HeaderButton>
                <span className="font-semibold text-gray-700 cursor-pointer px-3">{currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
                <HeaderButton onClick={() => handleDateChange(1)} title="Día siguiente"><ChevronRightIcon className="w-5 h-5 text-gray-600" /></HeaderButton>
            </div>
            <div className="relative">
                <input type="text" placeholder="Buscar o ingresar CUIL..." className="form-input w-full md:w-64 pl-10 p-2 border rounded-lg" value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><MagnifyingGlassIcon className="w-5 h-5" /></span>
            </div>
            <button onClick={handleOpenNewModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm flex items-center"><PlusIcon className="w-5 h-5 mr-2" />Nueva Solicitud</button>
          </div>
        </div>
        <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-6"><a href="#" className="border-indigo-500 text-indigo-600 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Prácticas Médicas</a><a href="#" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Internaciones</a><a href="#" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Medicamentos</a></nav></div>
        
        <div className="mt-6">
          <KanbanBoard 
            authorizations={authorizations}
            loading={loading}
            error={error}
            dateFilter={currentDate} 
            searchTerm={searchTerm} 
            onViewDetails={handleOpenViewModal}
          />
        </div>
      </div>
      
      <Modal isOpen={modalState.isOpen} onClose={handleCloseModal}>
        <AuthorizationForm 
          onSuccess={handleFormSuccess} 
          closeModal={handleCloseModal}
          isReadOnly={modalState.mode === 'view'}
          initialData={modalState.data}
        />
      </Modal>

      {historyData.isOpen && (
        <HistoryModal 
          cuil={historyData.cuil}
          history={historyData.results}
          onClose={() => setHistoryData({ ...historyData, isOpen: false })}
        />
      )}
    </div>
  );
}
=======
  useEffect(() => { fetchData(); }, [fetchData]);

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
    if (activeTab === 'medication') return [];
    return requests;
  }, [requests, activeTab]);

  const displayedColumns = useMemo(() => {
    if (activeTab === 'practice') return ALL_KANBAN_COLUMNS.filter(col => col.status !== 'Activa');
    if (activeTab === 'internment') return ALL_KANBAN_COLUMNS.filter(col => col.status !== 'Nuevas Solicitudes');
    if (activeTab === 'medication') return [];
    return ALL_KANBAN_COLUMNS;
  }, [activeTab]);

  const handleViewDetails = (request) => {
    if (request.requestType === 'internment') {
      setInternmentDetailModalState({ isOpen: true, request: request });
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

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-right" />
      <div className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Solicitudes</h1>
            <p className="text-gray-500 mt-1">Supervisa y gestiona todas las solicitudes médicas e internaciones.</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 mt-4 md:mt-0">
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
                      <a href="#" onClick={() => toast.error('Funcionalidad no implementada.')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Medicación</a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('practice'); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'practice' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Prácticas Médicas</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('internment'); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'internment' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Internaciones</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('medication'); toast.error('Funcionalidad no implementada.') }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'medication' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Medicamentos</a>
          </nav>
        </div>
      </div>
      <div className="flex-grow mt-6 overflow-y-auto px-4 sm:px-6">
        <KanbanBoard requests={displayedRequests} columns={displayedColumns} loading={loading} error={error} searchTerm={debouncedSearchTerm} onViewDetails={handleViewDetails} />
      </div>
      <Modal isOpen={authFormModalState.isOpen} onClose={handleCloseAuthForm}>
        <AuthorizationForm onSuccess={handleAuthFormSuccess} closeModal={handleCloseAuthForm} isReadOnly={authFormModalState.mode === 'view'} initialData={authFormModalState.data} internmentId={authFormModalState.internmentId} initialBeneficiary={authFormModalState.initialBeneficiary} />
      </Modal>
      <Modal isOpen={internmentFormModalOpen} onClose={handleCloseInternmentForm}>
          <InternmentForm onSuccess={handleInternmentFormSuccess} closeModal={handleCloseInternmentForm} />
      </Modal>
      <Modal isOpen={internmentDetailModalState.isOpen} onClose={handleCloseInternmentDetail}>
        <InternmentDetailModal request={internmentDetailModalState.request} onClose={handleCloseInternmentDetail} onAttachPractice={handleAttachPractice} />
      </Modal>
    </div>
  );
}
>>>>>>> master
