// src/components/internaciones/FieldAuditRequestForm.jsx
"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { ArrowLeftIcon, ArrowRightIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/solid';

export default function FieldAuditRequestForm({ internmentId, onSuccess, closeModal }) {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingAuditors, setLoadingAuditors] = useState(true);
  const [auditors, setAuditors] = useState([]);
  const [formData, setFormData] = useState({
    scheduledVisitDate: '',
    assignedAuditorId: '',
    isUrgent: false,
    additionalComments: '',
    requestReason: '',
    attachments: [],
    notifyProviderAfterHours: 0
  });

  useEffect(() => {
    const fetchAuditors = async () => {
      try {
        const response = await fetch('/api/users?role=auditor');
        if (!response.ok) throw new Error('No se pudo cargar la lista de auditores.');
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...Array.from(e.target.files)]
    }));
  };
  
  const removeFile = (fileToRemove) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(file => file !== fileToRemove)
    }));
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => setStep(prev => prev - 1);

  const validateStep = () => {
    if (step === 1) {
      if (!formData.scheduledVisitDate || !formData.assignedAuditorId) {
        toast.error('Por favor, complete la fecha y seleccione un auditor.');
        return false;
      }
    }
    if (step === 2) {
      if (!formData.requestReason.trim()) {
        toast.error('Por favor, ingrese el motivo que impulsa la auditoría.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    
    setLoading(true);

    const data = new FormData();
    data.append('assignedAuditorId', formData.assignedAuditorId);
    data.append('requestReason', formData.requestReason);
    data.append('additionalComments', formData.additionalComments);
    data.append('notifyProviderAfterHours', formData.notifyProviderAfterHours);
    data.append('scheduledVisitDate', formData.scheduledVisitDate);
    data.append('isUrgent', formData.isUrgent);
    
    for (const file of formData.attachments) {
      data.append('attachments', file);
    }

    try {
      const response = await fetch(`/api/internments/${internmentId}/field-audits`, {
        method: 'POST',
        body: data, // No se necesita header 'Content-Type', el navegador lo establece automáticamente para FormData
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
  
  const renderStepOne = () => (
    <div>
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Fase 1: Datos Básicos</h3>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="scheduledVisitDate" className="block text-sm font-medium text-gray-700">Fecha de realización</label>
          <input type="date" name="scheduledVisitDate" id="scheduledVisitDate" value={formData.scheduledVisitDate} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
        </div>
        <div>
          <label htmlFor="assignedAuditorId" className="block text-sm font-medium text-gray-700">Médico Auditor</label>
          <select name="assignedAuditorId" id="assignedAuditorId" value={formData.assignedAuditorId} onChange={handleChange} disabled={loadingAuditors} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="" disabled>{loadingAuditors ? 'Cargando...' : 'Seleccione un auditor'}</option>
            {auditors.map(auditor => <option key={auditor.id} value={auditor.id}>{auditor.name}</option>)}
          </select>
        </div>
        <div className="flex items-center">
          <input type="checkbox" name="isUrgent" id="isUrgent" checked={formData.isUrgent} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
          <label htmlFor="isUrgent" className="ml-2 block text-sm text-gray-900">Marcar como Urgente</label>
        </div>
      </div>
    </div>
  );

  const renderStepTwo = () => (
    <div>
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Fase 2: Detalles de la Solicitud</h3>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="requestReason" className="block text-sm font-medium text-gray-700">Razón que motiva la auditoría</label>
          <textarea name="requestReason" id="requestReason" rows="4" value={formData.requestReason} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Detalle los motivos..."></textarea>
        </div>
        <div>
          <p className="block text-sm font-medium text-gray-700">Solicitado por:</p>
          <p className="mt-1 text-sm text-gray-500">{session?.user?.name || 'Usuario no identificado'}</p>
        </div>
        <div className="mb-4">
          <label htmlFor="notificationDelay" className="block text-sm font-medium text-gray-700 mb-1">
            Retraso de notificación al prestador (horas)
          </label>
          <input
            type="number"
            id="notificationDelay"
            name="notifyProviderAfterHours"
            value={formData.notifyProviderAfterHours}
            onChange={handleChange}
            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            min="0"
          />
          <p className="mt-2 text-xs text-gray-500">
            La auditoría no será visible para el prestador hasta que pasen estas horas. Dejar en 0 para notificar inmediatamente.
          </p>
        </div>
      </div>
    </div>
  );

  const renderStepThree = () => (
    <div>
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Fase 3: Adjuntos y Comentarios</h3>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Archivos Adjuntos</label>
          <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <PaperClipIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Subir archivos</span>
                  <input id="file-upload" name="attachments" type="file" className="sr-only" multiple onChange={handleFileChange} />
                </label>
                <p className="pl-1">o arrastrar y soltar</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, PDF, etc.</p>
            </div>
          </div>
          {formData.attachments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-600">Archivos seleccionados:</h4>
              <ul className="mt-2 border border-gray-200 rounded-md divide-y divide-gray-200">
                {formData.attachments.map((file, index) => (
                  <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                    <div className="w-0 flex-1 flex items-center">
                      <PaperClipIcon className="flex-shrink-0 h-5 w-5 text-gray-400" aria-hidden="true" />
                      <span className="ml-2 flex-1 w-0 truncate">{file.name}</span>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <button type="button" onClick={() => removeFile(file)} className="font-medium text-red-600 hover:text-red-500">
                        <XMarkIcon className="h-5 w-5"/>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="additionalComments" className="block text-sm font-medium text-gray-700">Comentarios Adicionales</label>
          <textarea name="additionalComments" id="additionalComments" rows="3" value={formData.additionalComments} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Cualquier otra información relevante..."></textarea>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Solicitar Auditoría de Terreno</h2>
      <p className="text-sm text-gray-500 mb-6">Paso {step} de 3</p>

      <div className="flex-grow">
        {step === 1 && renderStepOne()}
        {step === 2 && renderStepTwo()}
        {step === 3 && renderStepThree()}
      </div>

      <div className="flex justify-between items-center pt-6">
        <div>
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 flex items-center"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Anterior
            </button>
          )}
        </div>
        <div className="flex items-center space-x-3">
            <button
            type="button"
            onClick={closeModal}
            className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            disabled={loading}
            >
            Cancelar
            </button>
            {step < 3 && (
            <button
                type="button"
                onClick={nextStep}
                className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center"
            >
                Siguiente
                <ArrowRightIcon className="h-5 w-5 ml-2" />
            </button>
            )}
            {step === 3 && (
            <button
                type="submit"
                className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={loading || loadingAuditors}
            >
                {loading ? 'Enviando...' : 'Confirmar y Enviar'}
            </button>
            )}
        </div>
      </div>
    </form>
  );
} 