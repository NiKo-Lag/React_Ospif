// src/components/autorizaciones/AuthorizationForm.jsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { XMarkIcon, LockClosedIcon, PaperClipIcon } from '@heroicons/react/24/solid';

const calculateAge = (birthDateString) => {
    if (!birthDateString) return '';
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const medicalPractices = ["Consulta Médica", "Tomografía Computada", "Resonancia Magnética Nuclear", "Análisis de Sangre Completo", "Endoscopía Digestiva Alta", "Ecografía Abdominal"];
const auditors = ["Dr. Anibal Lecter", "Dr. Gregory House", "Dra. Quinn, Medicine Woman"];
const practiceToProviderMap = {
    "Tomografía Computada": [1, 3],
    "Resonancia Magnética Nuclear": [3],
    "Análisis de Sangre Completo": [1, 2, 3],
    "Consulta Médica": [1, 2]
};

// Componente para los campos del formulario
const FormField = ({ label, children, htmlFor }) => (
    <div>
        <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);

export default function AuthorizationForm({ onSuccess, closeModal, initialData = null, isReadOnly = false }) {
    const [cuil, setCuil] = useState('');
    const [beneficiary, setBeneficiary] = useState(null);
    const [loadingBeneficiary, setLoadingBeneficiary] = useState(false);
    const [beneficiaryError, setBeneficiaryError] = useState('');
    const [formData, setFormData] = useState({
        prescriptionDate: '', practice: '', diagnosis: '', medicalLicense: '', attachment: null, auditor: '', providerId: '', observations: '', isImportant: false
    });
    const [providers, setProviders] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isPracticeSectionUnlocked = useMemo(() => beneficiary?.activo === true, [beneficiary]);

    const dateValidation = useMemo(() => {
        if (!formData.prescriptionDate) return { isValid: false, error: null };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        const prescDate = new Date(formData.prescriptionDate);
        prescDate.setMinutes(prescDate.getMinutes() + prescDate.getTimezoneOffset());
        if (prescDate < thirtyDaysAgo) return { isValid: false, error: "La fecha no puede tener más de 30 días." };
        if (prescDate > today) return { isValid: false, error: "La fecha no puede ser futura." };
        return { isValid: true, error: null };
    }, [formData.prescriptionDate]);

    const isAuditSectionUnlocked = useMemo(() => {
        if (!isPracticeSectionUnlocked) return false;
        const fieldsAreComplete = formData.prescriptionDate && formData.practice && formData.diagnosis && formData.medicalLicense && formData.attachment;
        return fieldsAreComplete && dateValidation.isValid;
    }, [isPracticeSectionUnlocked, formData, dateValidation.isValid]);

    useEffect(() => {
        if (initialData && initialData.details) {
            const { details } = initialData;
            if (details.beneficiaryData) {
                setBeneficiary(details.beneficiaryData);
                setCuil(details.beneficiaryData.cuil);
            }
            setFormData({
                prescriptionDate: details.prescriptionDate || '',
                practice: initialData.title || '',
                diagnosis: details.diagnosis || '',
                medicalLicense: details.solicitanteMatricula || '',
                attachment: null,
                auditor: details.auditorMedico || '',
                providerId: details.prestadorId || '',
                observations: details.observations || '',
                isImportant: initialData.isImportant || false,
            });
        }
    }, [initialData]);

    useEffect(() => {
        async function fetchProviders() {
            if (isReadOnly) return;
            try {
                const response = await fetch('/api/prestadores/all');
                if (!response.ok) {
                    throw new Error('La respuesta de la red no fue correcta');
                }
                const data = await response.json();
                setProviders(data);
            } catch (error) {
                console.error("Error al cargar prestadores:", error);
                toast.error("No se pudieron cargar los prestadores.");
            }
        }
        fetchProviders();
    }, [isReadOnly]);

    useEffect(() => {
        if (dateValidation.error) {
            toast.error(dateValidation.error, { id: 'date-error' });
        }
    }, [dateValidation.error]);

    const handleInputChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : (type === 'file' ? files?.[0] : value) }));
    };

    const handleSearchBeneficiary = async () => {
        if (beneficiary && String(beneficiary.cuil) === String(cuil)) return;
        if (!cuil) return;
        if (!/^\d{11}$/.test(cuil)) {
            if (cuil) setBeneficiaryError('CUIL inválido. Debe contener 11 dígitos sin guiones.');
            return;
        }
        setLoadingBeneficiary(true);
        setBeneficiaryError('');
        setBeneficiary(null);
        try {
            const response = await fetch(`/api/beneficiary/${cuil}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setBeneficiary(data);
            if (!data.activo) {
                toast.error('El beneficiario se encuentra INACTIVO.');
            }
        } catch (err) {
            setBeneficiaryError(err.message);
            toast.error(err.message);
        } finally {
            setLoadingBeneficiary(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!isAuditSectionUnlocked) {
            toast.error("Complete los campos obligatorios.");
            return;
        }
        setIsSubmitting(true);
        const dataToSubmit = new FormData();
        dataToSubmit.append('type', 'Práctica Médica');
        dataToSubmit.append('title', formData.practice);
        if (formData.attachment) {
            dataToSubmit.append('attachment', formData.attachment);
        }
        
        // --- SOLUCIÓN: Se clona el objeto de detalles y se elimina el adjunto antes de convertir a JSON
        const detailsToSubmit = { ...formData };
        delete detailsToSubmit.attachment;
        const details = { beneficiaryData: beneficiary, ...detailsToSubmit };
        
        dataToSubmit.append('details', JSON.stringify(details));

        try {
            const response = await fetch('/api/autorizaciones', { method: 'POST', body: dataToSubmit });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falló el envío.');
            }
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

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
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const suggestedProviders = useMemo(() => {
        if (!formData.practice) return [];
        const providerIds = practiceToProviderMap[formData.practice] || [];
        return providers.filter(p => providerIds.includes(p.id));
    }, [formData.practice, providers]);

    const planInfo = useMemo(() => {
        if (!beneficiary) return { plan: '', color: 'text-gray-500' };
        const esRelacionDependencia = beneficiary.fSssTipoDeBeneficiario?.nombre.toLowerCase().includes('relacion de dependencia');
        return esRelacionDependencia
            ? { plan: 'PLATINO', color: 'text-green-600' }
            : { plan: 'BORDO', color: 'text-yellow-600' };
    }, [beneficiary]);


    return (
        <form onSubmit={handleFormSubmit} className="flex flex-col h-full bg-gray-50">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
                <h2 className="text-xl font-semibold text-gray-800">{isReadOnly ? `Detalle Solicitud: #${initialData?.id}` : 'Nueva Solicitud'}</h2>
                <button type="button" onClick={closeModal} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"></button>
            </div>

            <div className="flex-grow p-6 space-y-6 overflow-y-auto">
                <fieldset disabled={isReadOnly} className="space-y-6">
                    {/* Sección Beneficiario */}
                    <div className="p-4 border rounded-lg bg-white">
                        <h3 className="font-semibold text-lg mb-3 text-gray-800">Beneficiario</h3>
                        <FormField label="CUIL" htmlFor="cuil">
                            <div className="flex">
                                <input type="text" id="cuil" name="cuil" value={cuil} onChange={(e) => setCuil(e.target.value)} onBlur={handleSearchBeneficiary} placeholder="Ingrese 11 dígitos sin guiones" className="form-input w-full rounded-r-none" />
                                <button type="button" onClick={handleSearchBeneficiary} disabled={loadingBeneficiary} className="bg-indigo-600 text-white px-4 rounded-r-lg hover:bg-indigo-700 disabled:bg-indigo-300">
                                    {loadingBeneficiary ? '...' : 'Buscar'}
                                </button>
                            </div>
                            {beneficiaryError && <p className="text-red-500 text-sm mt-1">{beneficiaryError}</p>}
                        </FormField>
                        {beneficiary && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg border grid grid-cols-3 gap-4">
                                <p><strong className="block text-sm text-gray-500">Nombre:</strong> {beneficiary.nombre}</p>
                                <p><strong className="block text-sm text-gray-500">Edad:</strong> {calculateAge(beneficiary.fechaNacimiento)}</p>
                                <p><strong className="block text-sm text-gray-500">Plan:</strong> <span className={planInfo.color}>{planInfo.plan}</span></p>
                            </div>
                        )}
                    </div>

                    {/* Sección Práctica Médica */}
                    <div className={`p-4 border rounded-lg bg-white relative ${!isPracticeSectionUnlocked && 'opacity-50'}`}>
                        {!isPracticeSectionUnlocked && <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center rounded-lg z-10"><LockClosedIcon className="h-8 w-8 text-gray-500" /></div>}
                        <h3 className="font-semibold text-lg mb-3 text-gray-800">Práctica Médica</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Fecha de Prescripción" htmlFor="prescriptionDate"><input type="date" id="prescriptionDate" name="prescriptionDate" value={formData.prescriptionDate} onChange={handleInputChange} className="form-input w-full" /></FormField>
                            <FormField label="Práctica Solicitada" htmlFor="practice"><select id="practice" name="practice" value={formData.practice} onChange={handleInputChange} className="form-select w-full"><option value="">Seleccione...</option>{medicalPractices.map(p => <option key={p} value={p}>{p}</option>)}</select></FormField>
                            <FormField label="Diagnóstico Presuntivo" htmlFor="diagnosis"><input type="text" id="diagnosis" name="diagnosis" value={formData.diagnosis} onChange={handleInputChange} className="form-input w-full" /></FormField>
                            <FormField label="Matrícula Solicitante" htmlFor="medicalLicense"><input type="text" id="medicalLicense" name="medicalLicense" value={formData.medicalLicense} onChange={handleInputChange} className="form-input w-full" /></FormField>
                            
                            {/* --- SOLUCIÓN: Lógica para visualizar/previsualizar el adjunto --- */}
                            <FormField label="Adjuntar Orden" htmlFor="attachment">
                                {isReadOnly ? (
                                    initialData?.details?.attachmentUrl ? (
                                        <a href={initialData.details.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 underline">
                                            <PaperClipIcon className="h-5 w-5" />
                                            <span>Ver Orden Adjunta</span>
                                        </a>
                                    ) : (
                                        <p className="text-gray-500">No hay orden adjunta.</p>
                                    )
                                ) : (
                                    <div>
                                        <input type="file" id="attachment" name="attachment" onChange={handleInputChange} className="form-input w-full" />
                                        {formData.attachment && typeof formData.attachment === 'object' && (
                                            <a href={URL.createObjectURL(formData.attachment)} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800 underline mt-1 inline-block">
                                                Previsualizar archivo seleccionado
                                            </a>
                                        )}
                                    </div>
                                )}
                            </FormField>
                        </div>
                    </div>

                    {/* Sección Auditoría */}
                    <div className={`p-4 border rounded-lg bg-white relative ${!isAuditSectionUnlocked && 'opacity-50'}`}>
                         {!isAuditSectionUnlocked && <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center rounded-lg z-10"><LockClosedIcon className="h-8 w-8 text-gray-500" /></div>}
                        <h3 className="font-semibold text-lg mb-3 text-gray-800">Auditoría y Prestación</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Auditor Médico" htmlFor="auditor"><select id="auditor" name="auditor" value={formData.auditor} onChange={handleInputChange} className="form-select w-full"><option value="">Seleccione...</option>{auditors.map(a => <option key={a} value={a}>{a}</option>)}</select></FormField>
                            <FormField label="Prestador Sugerido" htmlFor="providerId"><select id="providerId" name="providerId" value={formData.providerId} onChange={handleInputChange} className="form-select w-full"><option value="">Seleccione...</option>{suggestedProviders.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}</select></FormField>
                            <div className="md:col-span-2"><FormField label="Observaciones" htmlFor="observations"><textarea id="observations" name="observations" value={formData.observations} onChange={handleInputChange} rows="3" className="form-textarea w-full"></textarea></FormField></div>
                        </div>
                    </div>
                </fieldset>
            </div>

            <div className="flex-shrink-0 p-4 border-t flex justify-between items-center bg-gray-50 rounded-b-lg">
                {isReadOnly ? (
                  <div className="flex space-x-2">
                    <button type="button" onClick={() => handleUpdateStatus('Rechazada')} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors">
                      {isSubmitting ? '...' : 'Rechazar'}
                    </button>
                    <button type="button" onClick={() => handleUpdateStatus('Autorizada')} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors">
                      {isSubmitting ? '...' : 'Autorizar'}
                    </button>
                  </div>
                ) : (
                  <div></div>
                )}

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
