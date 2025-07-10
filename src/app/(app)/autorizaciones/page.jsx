// src/app/(app)/autorizaciones/page.jsx

"use client";

import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import KanbanBoard from '@/components/autorizaciones/KanbanBoard';
import Modal from '@/components/ui/Modal';
import AuthorizationForm from '@/components/autorizaciones/AuthorizationForm';
import HistoryModal from '@/components/autorizaciones/HistoryModal';
import toast, { Toaster } from 'react-hot-toast';

// Hook de Debounce para retrasar la ejecución de una función ---
// Esto evita que hagamos llamadas a la API en cada pulsación de tecla.
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpia el timeout si el valor cambia (por ejemplo, el usuario sigue escribiendo)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};


const HeaderButton = ({ children, onClick, title }) => (
  <button onClick={onClick} title={title} className="p-2 rounded-md hover:bg-gray-100 transition-colors">{children}</button>
);

export default function AutorizacionesPage() {
  const [currentDate, setCurrentDate] = useState(new Date()); // Inicializar directamente
  const [searchTerm, setSearchTerm] = useState('');
  const [historyData, setHistoryData] = useState({ isOpen: false, cuil: '', results: [] });
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'new',
    data: null,
  });

  // Usamos el valor "debounced" del término de búsqueda ---
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isCuilSearch = /^\d{11}$/.test(debouncedSearchTerm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/autorizaciones');
      if (!response.ok) throw new Error('No se pudo obtener la información.');
      const data = await response.json();
      setAuthorizations(data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenNewModal = () => setModalState({ isOpen: true, mode: 'new', data: null });
  const handleOpenViewModal = (authData) => setModalState({ isOpen: true, mode: 'view', data: authData });
  const handleCloseModal = () => setModalState({ isOpen: false, mode: 'new', data: null });

  const handleFormSuccess = () => {
    handleCloseModal();
    toast.success('¡Solicitud guardada con éxito!');
    fetchData(); 
  };
  
  const handleDateChange = (days) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  // El onChange ahora solo actualiza el estado, no hace llamadas a la API ---
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Nueva función para buscar el historial, llamada por un botón ---
    const handleFetchHistory = async () => {
        if (!isCuilSearch) return;
        const toastId = toast.loading('Buscando historial...');
        try {
          const response = await fetch(`/api/autorizaciones/history/${debouncedSearchTerm}`);
    
          // ✅ **LÍNEA CLAVE AÑADIDA**
          // Verifica si la respuesta de la API fue exitosa (status 2xx)
          if (!response.ok) {
            // Si no fue exitosa, lee el mensaje de error de la API y lanza una excepción
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al conectar con la API.");
          }
    
          const results = await response.json();
          
          if (results.length === 0) {
            toast.success('No se encontró historial para el CUIL indicado.', { id: toastId });
            return;
          }
          
          setHistoryData({ isOpen: true, cuil: debouncedSearchTerm, results: results });
          toast.dismiss(toastId);
    
        } catch (error) {
          // Ahora este bloque catch recibirá los errores de la API de forma controlada
          toast.error(error.message || "Error al buscar el historial.", { id: toastId });
        }
      };

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-right" toastOptions={{ style: { background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: '#1f2937', border: '1px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', }, success: { iconTheme: { primary: '#16a34a', secondary: 'white' } }, error: { iconTheme: { primary: '#dc2626', secondary: 'white' } } }} />
      
      <div className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Autorizaciones</h1>
            <p className="text-gray-500 mt-1">Supervisa y gestiona todas las solicitudes médicas.</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 mt-4 md:mt-0">
            <div className="flex items-center space-x-2 bg-white p-1 rounded-lg shadow-sm border">
              <HeaderButton onClick={() => handleDateChange(-1)} title="Día anterior"><ChevronLeftIcon className="w-5 h-5 text-gray-600" /></HeaderButton>
              <span className="font-semibold text-gray-700 cursor-pointer px-3 text-center w-32">{currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
              <HeaderButton onClick={() => handleDateChange(1)} title="Día siguiente"><ChevronRightIcon className="w-5 h-5 text-gray-600" /></HeaderButton>
            </div>
            <div className="relative flex items-center">
              <input type="text" placeholder="Buscar o ingresar CUIL..." className="form-input w-full md:w-56 pl-10 p-2 border rounded-lg" value={searchTerm} onChange={handleSearchChange} />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><MagnifyingGlassIcon className="w-5 h-5" /></span>
              {/* Botón para ver historial que aparece condicionalmente --- */}
              {isCuilSearch && (
                <button onClick={handleFetchHistory} title="Ver historial del CUIL" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200">
                  <ClockIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            <button onClick={handleOpenNewModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm flex items-center transition-colors"><PlusIcon className="w-5 h-5 mr-2" />Nueva Solicitud</button>
          </div>
        </div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <a href="#" className="border-indigo-500 text-indigo-600 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Prácticas Médicas</a>
            <a href="#" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Internaciones</a>
            <a href="#" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Medicamentos</a>
          </nav>
        </div>
      </div>
      
      <div className="flex-grow mt-6 overflow-y-auto px-4 sm:px-6">
        <KanbanBoard 
          authorizations={authorizations}
          loading={loading}
          error={error}
          dateFilter={currentDate} 
          searchTerm={debouncedSearchTerm} // Usar el término con debounce para filtrar
          onViewDetails={handleOpenViewModal}
        />
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
