// src/components/internaciones/FieldAuditRequestForm.jsx
"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

export default function FieldAuditRequestForm({ internmentId, onSuccess, closeModal }) {
  const { data: session } = useSession();
  const [auditors, setAuditors] = useState([]);
  const [selectedAuditor, setSelectedAuditor] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAuditors, setLoadingAuditors] = useState(true);

  useEffect(() => {
    // Cargar la lista de auditores disponibles
    const fetchAuditors = async () => {
      try {
        // Asumimos que tenemos un endpoint para obtener los usuarios con rol de auditor
        const response = await fetch('/api/users?role=auditor');
        if (!response.ok) {
          throw new Error('No se pudo cargar la lista de auditores.');
        }
        const data = await response.json();
        setAuditors(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoadingAuditors(false);
      }
    };
    fetchAuditors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAuditor) {
      toast.error('Debe seleccionar un auditor.');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`/api/internments/${internmentId}/field-audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedAuditorId: selectedAuditor,
          requestReason: requestReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al solicitar la auditoría.');
      }
      
      toast.success('Auditoría de terreno solicitada con éxito.');
      if (onSuccess) onSuccess();
      closeModal();
      
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-xl max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Solicitar Auditoría de Terreno</h2>
      
      <div className="mb-4">
        <label htmlFor="auditor" className="block text-sm font-medium text-gray-700 mb-1">
          Asignar a Médico Auditor
        </label>
        <select
          id="auditor"
          value={selectedAuditor}
          onChange={(e) => setSelectedAuditor(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          disabled={loadingAuditors || loading}
        >
          <option value="" disabled>
            {loadingAuditors ? 'Cargando auditores...' : 'Seleccione un auditor'}
          </option>
          {auditors.map((auditor) => (
            <option key={auditor.id} value={auditor.id}>
              {auditor.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
          Motivo de la Solicitud (Opcional)
        </label>
        <textarea
          id="reason"
          rows="4"
          value={requestReason}
          onChange={(e) => setRequestReason(e.target.value)}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Describa brevemente por qué se solicita esta auditoría..."
          disabled={loading}
        ></textarea>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={closeModal}
          className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          disabled={loading || loadingAuditors || !selectedAuditor}
        >
          {loading ? 'Solicitando...' : 'Confirmar Solicitud'}
        </button>
      </div>
    </form>
  );
} 