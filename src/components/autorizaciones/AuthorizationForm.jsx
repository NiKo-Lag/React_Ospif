// src/components/autorizaciones/AuthorizationForm.jsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast'; // Importamos toast

const medicalPractices = ["Consulta Médica", "Tomografía Computada", "Resonancia Magnética Nuclear", "Análisis de Sangre Completo", "Endoscopía Digestiva Alta", "Ecografía Abdominal"];
const auditors = ["Dr. Anibal Lecter", "Dr. Gregory House", "Dra. Quinn, Medicine Woman"];
const practiceToProviderMap = { "Tomografía Computada": [1, 3], "Resonancia Magnética Nuclear": [3], "Análisis de Sangre Completo": [1, 2, 3], "Consulta Médica": [1, 2] };

// Recibe la nueva prop 'onSuccess'
export default function AuthorizationForm({ onSuccess, closeModal }) {
  const [cuil, setCuil] = useState('');
  const [beneficiary, setBeneficiary] = useState(null);
  const [loadingBeneficiary, setLoadingBeneficiary] = useState(false);
  const [beneficiaryError, setBeneficiaryError] = useState('');
  const [formData, setFormData] = useState({ prescriptionDate: '', practice: '', diagnosis: '', medicalLicense: '', attachment: null, auditor: '', providerId: '', observations: '', isImportant: false });
  const [providers, setProviders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch('/api/prestadores/all');
        const data = await response.json();
        setProviders(data);
      } catch (error) { console.error("Error al cargar prestadores:", error); }
    }
    fetchProviders();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : (type === 'file' ? files[0] : value) }));
  };
  
  const handleSearchBeneficiary = async () => {
    if (!/^\d{11}$/.test(cuil)) { setBeneficiaryError('CUIL inválido.'); return; }
    setLoadingBeneficiary(true);
    setBeneficiaryError('');
    setBeneficiary(null);
    try {
      const response = await fetch(`/api/beneficiary/${cuil}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setBeneficiary(data);
    } catch (err) {
      setBeneficiaryError(err.message);
    } finally {
      setLoadingBeneficiary(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!beneficiary || !beneficiary.activo) { toast.error("Debe seleccionar un beneficiario activo."); return; }
    setIsSubmitting(true);
    
    const dataToSubmit = new FormData();
    dataToSubmit.append('type', 'Práctica Médica');
    dataToSubmit.append('title', formData.practice);
    if (formData.attachment) { dataToSubmit.append('attachment', formData.attachment); }
    const details = { beneficiaryData: beneficiary, ...formData };
    dataToSubmit.append('details', JSON.stringify(details));

    try {
        const response = await fetch('/api/autorizaciones', { method: 'POST', body: dataToSubmit });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Falló el envío de la solicitud.');
        }
        // --- LLAMAMOS A LA FUNCIÓN onSuccess ---
        onSuccess();
    } catch (error) {
        toast.error(error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const suggestedProviders = useMemo(() => {
    const providerIds = practiceToProviderMap[formData.practice] || [];
    return providers.filter(p => providerIds.includes(p.id));
  }, [formData.practice, providers]);

  return (
    <form onSubmit={handleFormSubmit}>
        <div className="p-4 border-b"><h2 className="text-xl font-bold text-gray-800">Nueva Solicitud</h2></div>
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Formulario (sin cambios en la estructura) */}
            <div className="p-4 border rounded-md bg-gray-50">
              <h4 className="font-semibold text-gray-700 mb-3">Sección Beneficiario</h4>
              {beneficiaryError && <p className="text-sm text-red-600 mb-2">{beneficiaryError}</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700">CUIL*</label><div className="flex items-center mt-1"><input type="text" value={cuil} onChange={(e) => setCuil(e.target.value)} className="form-input p-2 border-gray-300 rounded-l-md w-full" placeholder="11 dígitos" maxLength="11"/><button type="button" onClick={handleSearchBeneficiary} disabled={loadingBeneficiary} className="bg-gray-200 hover:bg-gray-300 p-2 rounded-r-md border-t border-r border-b border-gray-300 disabled:opacity-50">{loadingBeneficiary ? '...' : 'Buscar'}</button></div></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Nombre y Apellido</label><input type="text" value={beneficiary ? `${beneficiary.apellido}, ${beneficiary.nombre}` : ''} className="form-input p-2 border-gray-300 rounded-md w-full mt-1 bg-gray-100" disabled/></div>
                  <div><label className="block text-sm font-medium text-gray-700">Estado</label><input type="text" value={beneficiary ? (beneficiary.activo ? 'Activo' : 'Inactivo') : ''} className={`form-input p-2 border-gray-300 rounded-md w-full mt-1 bg-gray-100 font-bold ${beneficiary?.activo ? 'text-green-600' : 'text-red-600'}`} disabled/></div>
              </div>
            </div>
            <div className="p-4 border rounded-md">
              <h4 className="font-semibold text-gray-700 mb-3">Sección Solicitud de Práctica</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium">Fecha de Prescripción*</label><input name="prescriptionDate" type="date" value={formData.prescriptionDate} onChange={handleInputChange} className="form-input p-2 border-gray-300 rounded-md w-full mt-1" /></div>
                  <div><label className="block text-sm font-medium">Práctica Solicitada*</label><select name="practice" value={formData.practice} onChange={handleInputChange} className="form-input p-2 border-gray-300 rounded-md w-full mt-1"><option value="">Seleccione...</option>{medicalPractices.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium">Diagnóstico Presuntivo*</label><textarea name="diagnosis" value={formData.diagnosis} onChange={handleInputChange} rows="2" className="form-input p-2 border-gray-300 rounded-md w-full mt-1"></textarea></div>
                  <div><label className="block text-sm font-medium">Nro. Matrícula Solicitante*</label><input name="medicalLicense" type="text" value={formData.medicalLicense} onChange={handleInputChange} className="form-input p-2 border-gray-300 rounded-md w-full mt-1" /></div>
                  <div><label className="block text-sm font-medium">Adjuntar Orden Médica*</label><input name="attachment" type="file" onChange={handleInputChange} className="form-input p-2 border-gray-300 rounded-md w-full mt-1" /></div>
              </div>
            </div>
            <div className="p-4 border rounded-md">
                <h4 className="font-semibold text-gray-700 mb-3">Sección Auditoría</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium">Médico Auditor*</label><select name="auditor" value={formData.auditor} onChange={handleInputChange} className="form-input p-2 border-gray-300 rounded-md w-full mt-1"><option value="">Seleccionar...</option>{auditors.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                    <div><label className="block text-sm font-medium">Prestador Sugerido*</label><select name="providerId" value={formData.providerId} onChange={handleInputChange} disabled={suggestedProviders.length === 0} className="form-input p-2 border-gray-300 rounded-md w-full mt-1 disabled:bg-gray-100"><option value="">{formData.practice ? "Seleccione..." : "Seleccione una práctica primero"}</option>{suggestedProviders.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}</select></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium">Observaciones</label><textarea name="observations" value={formData.observations} onChange={handleInputChange} rows="3" className="form-input p-2 border-gray-300 rounded-md w-full mt-1"></textarea></div>
                </div>
                <div className="mt-4"><label className="flex items-center cursor-pointer"><input name="isImportant" type="checkbox" checked={formData.isImportant} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /><span className="ml-2 text-sm text-gray-900 font-medium">Marcar como solicitud importante</span></label></div>
            </div>
        </div>
        <div className="p-4 border-t flex justify-end space-x-3 bg-gray-50">
            <button type="button" onClick={closeModal} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">{isSubmitting ? 'Guardando...' : 'Guardar Solicitud'}</button>
        </div>
    </form>
  );
}