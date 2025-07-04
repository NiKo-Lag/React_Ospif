// app/(app)/autorizaciones/page.jsx

"use client";

import { useState, useEffect, useCallback } from 'react'; // Añade useCallback
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import KanbanBoard from '@/components/autorizaciones/KanbanBoard';
import Modal from '@/components/ui/Modal';
import AuthorizationForm from '@/components/autorizaciones/AuthorizationForm';
import toast, { Toaster } from 'react-hot-toast'; // Importamos react-hot-toast

const HeaderButton = ({ children, onClick, title }) => (
  <button onClick={onClick} title={title} className="p-2 rounded-md hover:bg-gray-100">{children}</button>
);

export default function AutorizacionesPage() {
  // Estados de los filtros
  const [currentDate, setCurrentDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- ESTADOS DE DATOS (Movidos desde KanbanBoard) ---
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- FUNCIÓN PARA OBTENER LOS DATOS ---
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

  // useEffect para la carga inicial de datos
  useEffect(() => {
    setCurrentDate(new Date());
    fetchData();
  }, [fetchData]);

  // --- FUNCIÓN PARA MANEJAR EL ÉXITO DEL FORMULARIO ---
  const handleFormSuccess = () => {
    setIsModalOpen(false); // Cierra el modal
    toast.success('¡Solicitud guardada con éxito!');
    fetchData(); // Vuelve a cargar los datos para refrescar el tablero
  };

  const handleDateChange = (days) => {
    setCurrentDate(prev => {
      if (!prev) return new Date();
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  if (!currentDate) {
    return null;
  }

  return (
    <div>
      <Toaster position="top-right" /> {/* Componente para mostrar notificaciones */}
      <div className="p-4 sm:p-6 h-full">
        {/* ENCABEZADO Y FILTROS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div><h1 className="text-2xl font-bold text-gray-800">Gestión de Autorizaciones</h1><p className="text-gray-500 mt-1">Supervisa y gestiona todas las solicitudes médicas.</p></div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="flex items-center space-x-2 bg-white p-1 rounded-lg shadow-sm border">
                <HeaderButton onClick={() => handleDateChange(-1)} title="Día anterior"><ChevronLeftIcon className="w-5 h-5 text-gray-600" /></HeaderButton>
                <span className="font-semibold text-gray-700 cursor-pointer px-3">{currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
                <HeaderButton onClick={() => handleDateChange(1)} title="Día siguiente"><ChevronRightIcon className="w-5 h-5 text-gray-600" /></HeaderButton>
            </div>
            <div className="relative">
                <input type="text" placeholder="Buscar..." className="form-input w-full md:w-64 pl-10 p-2 border rounded-lg" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><MagnifyingGlassIcon className="w-5 h-5" /></span>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm flex items-center"><PlusIcon className="w-5 h-5 mr-2" />Nueva Solicitud</button>
          </div>
        </div>
        {/* PESTAÑAS */}
        <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-6"><a href="#" className="border-indigo-500 text-indigo-600 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Prácticas Médicas</a><a href="#" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Internaciones</a><a href="#" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Medicamentos</a></nav></div>
        {/* TABLERO KANBAN */}
        <div className="mt-6">
          <KanbanBoard 
            authorizations={authorizations}
            loading={loading}
            error={error}
            dateFilter={currentDate} 
            searchTerm={searchTerm} 
          />
        </div>
      </div>
      {/* MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <AuthorizationForm 
          onSuccess={handleFormSuccess} // Pasamos la función de éxito
          closeModal={() => setIsModalOpen(false)} 
        />
      </Modal>
    </div>
  );
}