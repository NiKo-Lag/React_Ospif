// src/components/internaciones/FieldAuditCompletionForm.jsx
"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function FieldAuditCompletionForm({ audit, onSuccess, closeModal }) {
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 16));
  const [observations, setObservations] = useState(audit?.observations || '');
  const [checklistData, setChecklistData] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!visitDate || !observations) {
      toast.error('La fecha de visita y las observaciones son obligatorias.');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`/api/field-audits/${audit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitDate,
          observations,
          checklistData: { notes: checklistData }, // Enviamos el checklist como un objeto
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al completar la auditoría.');
      }
      
      toast.success('Auditoría completada con éxito.');
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
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Completar Auditoría de Terreno</h2>
      
      <div className="mb-4">
        <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700 mb-1">
          Fecha y Hora de la Visita
        </label>
        <input
          type="datetime-local"
          id="visitDate"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          disabled={loading}
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-1">
          Observaciones del Auditor
        </label>
        <textarea
          id="observations"
          rows="6"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Detalle sus hallazgos, evaluación del paciente, cumplimiento de protocolos, etc."
          disabled={loading}
          required
        ></textarea>
      </div>

      <div className="mb-6">
        <label htmlFor="checklist" className="block text-sm font-medium text-gray-700 mb-1">
          Checklist / Notas Adicionales
        </label>
        <textarea
          id="checklist"
          rows="4"
          value={checklistData}
          onChange={(e) => setChecklistData(e.target.value)}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Notas rápidas o puntos clave del checklist."
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
          className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Marcar como Completada'}
        </button>
      </div>
    </form>
  );
} 