// src/components/autorizaciones/AuthorizationForm.jsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { XMarkIcon, LockClosedIcon } from '@heroicons/react/24/solid';

// ... (El código de calculateAge y las constantes de datos permanecen igual)
const calculateAge = (birthDateString) => { if (!birthDateString) return ''; const birthDate = new Date(birthDateString); const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--; return age;};
const medicalPractices = ["Consulta Médica", "Tomografía Computada", "Resonancia Magnética Nuclear", "Análisis de Sangre Completo", "Endoscopía Digestiva Alta", "Ecografía Abdominal"];
const auditors = ["Dr. Anibal Lecter", "Dr. Gregory House", "Dra. Quinn, Medicine Woman"];
const practiceToProviderMap = { "Tomografía Computada": [1, 3], "Resonancia Magnética Nuclear": [3], "Análisis de Sangre Completo": [1, 2, 3], "Consulta Médica": [1, 2] };

export default function AuthorizationForm({ onSuccess, closeModal, initialData = null, isReadOnly = false }) {
  // ... (Todos los estados permanecen igual)
  const [cuil, setCuil] = useState('');
  const [beneficiary, setBeneficiary] = useState(null);
  const [loadingBeneficiary, setLoadingBeneficiary] = useState(false);
  const [beneficiaryError, setBeneficiaryError] = useState('');
  const [formData, setFormData] = useState({ prescriptionDate: '', practice: '', diagnosis: '', medicalLicense: '', attachment: null, auditor: '', providerId: '', observations: '', isImportant: false });
  const [providers, setProviders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuditSection, setShowAuditSection] = useState(false);

  // ... (Toda la lógica de useMemo y useEffect permanece igual)
  const isPracticeSectionUnlocked = useMemo(() => beneficiary?.activo === true, [beneficiary]);
  const isAuditSectionUnlocked = useMemo(() => { if (!isPracticeSectionUnlocked) return false; const fieldsAreComplete = formData.prescriptionDate && formData.practice && formData.diagnosis && formData.medicalLicense && formData.attachment; if (!fieldsAreComplete) return false; const today = new Date(); today.setHours(0, 0, 0, 0); const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(today.getDate() - 30); thirtyDaysAgo.setHours(0, 0, 0, 0); const prescDate = new Date(formData.prescriptionDate); prescDate.setMinutes(prescDate.getMinutes() + prescDate.getTimezoneOffset()); const isDateValid = prescDate >= thirtyDaysAgo && prescDate <= today; return isDateValid; }, [isPracticeSectionUnlocked, formData]);
  useEffect(() => { if (initialData && initialData.details) { const details = initialData.details; if (details.beneficiaryData) { setBeneficiary(details.beneficiaryData); setCuil(details.beneficiaryData.cuil); } setFormData({ prescriptionDate: details.prescriptionDate || '', practice: initialData.title || '', diagnosis: details.diagnosis || '', medicalLicense: details.solicitanteMatricula || '', attachment: null, auditor: details.auditorMedico || '', providerId: details.prestadorId || '', observations: details.observations || '', isImportant: initialData.isImportant || false, }); } }, [initialData]);
  useEffect(() => { async function fetchProviders() { if(isReadOnly) return; try { const response = await fetch('/api/prestadores/all'); const data = await response.json(); setProviders(data); } catch (error) { console.error("Error al cargar prestadores:", error); } } fetchProviders(); }, [isReadOnly]);
  useEffect(() => { if (!formData.prescriptionDate) return; const today = new Date(); today.setHours(0, 0, 0, 0); const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(today.getDate() - 30); thirtyDaysAgo.setHours(0, 0, 0, 0); const prescDate = new Date(formData.prescriptionDate); prescDate.setMinutes(prescDate.getMinutes() + prescDate.getTimezoneOffset()); if (prescDate < thirtyDaysAgo) { toast.error("La fecha no puede tener más de 30 días de antigüedad."); } if (prescDate > today) { toast.error("La fecha no puede ser una fecha futura."); } }, [formData.prescriptionDate]);
  
  // ... (handleInputChange y handleSearchBeneficiary permanecen igual)
  const handleInputChange = (e) => { const { name, value, type, checked, files } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : (type === 'file' ? files?.[0] : value) })); };
  const handleSearchBeneficiary = async () => { if (beneficiary && String(beneficiary.cuil) === String(cuil)) return; if (!cuil) return; if (!/^\d{11}$/.test(cuil)) { if(cuil) setBeneficiaryError('CUIL inválido.'); return; } setLoadingBeneficiary(true); setBeneficiaryError(''); setBeneficiary(null); try { const response = await fetch(`/api/beneficiary/${cuil}`); const data = await response.json(); if (!response.ok) throw new Error(data.message); setBeneficiary(data); if (!data.activo) toast.error('El beneficiario se encuentra INACTIVO.'); } catch (err) { setBeneficiaryError(err.message); } finally { setLoadingBeneficiary(false); } };
  
  const handleFormSubmit = async (e) => { e.preventDefault(); if (!isAuditSectionUnlocked) { toast.error("Complete los campos obligatorios."); return; } setIsSubmitting(true); const dataToSubmit = new FormData(); dataToSubmit.append('type', 'Práctica Médica'); dataToSubmit.append('title', formData.practice); if (formData.attachment) dataToSubmit.append('attachment', formData.attachment); const details = { beneficiaryData: beneficiary, ...formData }; dataToSubmit.append('details', JSON.stringify(details)); try { const response = await fetch('/api/autorizaciones', { method: 'POST', body: dataToSubmit }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Falló el envío.'); } onSuccess(); } catch (error) { toast.error(error.message); } finally { setIsSubmitting(false); } };
  
  // --- NUEVA FUNCIÓN PARA ACTUALIZAR EL ESTADO ---
  const handleUpdateStatus = async (newStatus) => {
    if (!initialData || !initialData.id) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/autorizaciones/${initialData.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `No se pudo ${newStatus.toLowerCase()} la solicitud.`);
      }
      toast.success(`Solicitud ${newStatus.toLowerCase()}a con éxito.`);
      onSuccess(); // Llama a la función para cerrar el modal y refrescar el tablero
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... (suggestedProviders y planInfo permanecen igual)
  const suggestedProviders = useMemo(() => { const providerIds = practiceToProviderMap?.[formData.practice] || []; return providers.filter(p => providerIds.includes(p.id)); }, [formData.practice, providers]);
  const planInfo = useMemo(() => { if (!beneficiary) return { plan: '', color: 'text-gray-500' }; const esRelacionDependencia = beneficiary.fSssTipoDeBeneficiario?.nombre.toLowerCase().includes('relacion de dependencia'); return esRelacionDependencia ? { plan: 'PLATINO', color: 'text-green-600' } : { plan: 'BORDO', color: 'text-yellow-600' }; }, [beneficiary]);

  return (
    <form onSubmit={handleFormSubmit}>
      <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
        <h2 className="text-xl font-semibold text-gray-800">{isReadOnly ? `Detalle Solicitud: #${initialData?.id}` : 'Nueva Solicitud'}</h2>
        <button type="button" onClick={closeModal} className="p-1 rounded-full text-gray-400 hover:bg-gray-200"><XMarkIcon className="h-6 w-6" /></button>
      </div>

      <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)] bg-gray-50">
        <fieldset disabled={isReadOnly}>{/* ... (contenido del formulario sin cambios) ... */}</fieldset>
      </div>

      <div className="p-4 border-t flex justify-between items-center bg-gray-50 rounded-b-lg">
        {isReadOnly ? (
          <div className="flex space-x-2">
            <button type="button" onClick={() => handleUpdateStatus('Rechazada')} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
              {isSubmitting ? '...' : 'Rechazar'}
            </button>
            <button type="button" onClick={() => handleUpdateStatus('Autorizada')} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
              {isSubmitting ? '...' : 'Autorizar'}
            </button>
          </div>
        ) : ( <div></div> )}

        {isReadOnly ? (
            <button type="button" onClick={closeModal} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">Cerrar</button>
        ) : (
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={closeModal} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">Cancelar</button>
            <button type="submit" disabled={isSubmitting || !isAuditSectionUnlocked} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Guardar Solicitud'}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
