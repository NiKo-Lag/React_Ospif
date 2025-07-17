// src/components/internaciones/InternmentNotificationWizard.jsx

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { CheckIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
// Se elimina la importación problemática de UploadCloudIcon

// Componente para la barra de progreso
const ProgressBar = ({ currentStep, steps }) => (
    <div className="flex justify-between items-center">
        {steps.map((name, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            return (
                <React.Fragment key={name}>
                    <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                            isCompleted ? 'bg-indigo-600 text-white' : 
                            isActive ? 'bg-white border-2 border-indigo-600 text-indigo-600' : 
                            'bg-gray-200 text-gray-500'
                        }`}>
                            {isCompleted ? <CheckIcon className="w-5 h-5" /> : stepNumber}
                        </div>
                        <p className={`ml-3 font-medium transition-colors duration-300 ${isActive || isCompleted ? 'text-indigo-600' : 'text-gray-500'}`}>{name}</p>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`flex-1 h-1 mx-4 transition-colors duration-300 ${isCompleted ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

// Componente para la zona de Drag & Drop
const DropZone = ({ files, setFiles }) => {
    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50');
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(droppedFiles);
    };
    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);
    };

    return (
        <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Orden de Internación, Informe de Guardia, etc.</label>
            <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
                className="mt-2 flex justify-center items-center w-full h-48 px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-indigo-500 hover:bg-gray-50 transition-colors"
            >
                <input id="file-input" type="file" multiple className="hidden" onChange={handleFileSelect} />
                <div className="space-y-1 text-center">
                    {/* --- CORRECCIÓN: Se utiliza un SVG en línea en lugar del ícono importado --- */}
                    <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3.75 3.75M12 9.75L8.25 13.5M3 17.25V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 17.25z" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                        <p className="pl-1">Arrastre y suelte archivos aquí, o <span className="font-medium text-indigo-600">haga clic para seleccionar</span></p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG, DOCX</p>
                </div>
            </div>
            <div id="file-list" className="mt-4 text-sm text-gray-700 space-y-1">
                {files.map((file, index) => (
                    <div key={index}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</div>
                ))}
            </div>
        </div>
    );
};


export default function InternmentNotificationWizard({ onSuccess, closeModal }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [beneficiarySearch, setBeneficiarySearch] = useState('');
    const [beneficiary, setBeneficiary] = useState(null);
    const [loadingBeneficiary, setLoadingBeneficiary] = useState(false);
    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        internmentType: 'urgencia',
        admissionDatetime: '',
        admissionType: 'Guardia',
        admissionSector: 'Sala General',
        admissionReason: '',
        attendingDoctor: '',
        roomNumber: '',
        presumptiveDiagnosis: '',
        clinicalSummary: '',
        additionalComments: '',
    });

    const stepNames = ["Beneficiario", "Datos del Evento", "Documentación"];

    const handleInputChange = (e) => {
        const { id, value, type, name } = e.target;
        setFormData(prev => ({ ...prev, [type === 'radio' ? name : id]: value }));
    };

    const handleSearchBeneficiary = async () => {
        if (!beneficiarySearch) return;
        setLoadingBeneficiary(true);
        setBeneficiary(null);
        try {
            // NOTA PARA FUTURA MEJORA:
            // La búsqueda actual solo funciona si el usuario introduce un CUIL de 11 dígitos.
            // Para soportar DNI, se debería implementar una lógica aquí para:
            // 1. Detectar si la entrada es un DNI o un CUIL.
            // 2. Si es un DNI, llamar a un endpoint diferente o a una librería que pueda convertir DNI a CUIL.
            const response = await fetch(`/api/beneficiary/${beneficiarySearch}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setBeneficiary(data);
            if (!data.activo) toast.error('El beneficiario se encuentra INACTIVO.');
            else toast.success('Beneficiario Activo encontrado.');
        } catch (err) {
            toast.error(err.message || 'No se encontró el beneficiario.');
        } finally {
            setLoadingBeneficiary(false);
        }
    };

    const canGoToNextStep = useMemo(() => {
        if (currentStep === 1) return !!beneficiary && beneficiary.activo === true;
        if (currentStep === 2) return formData.admissionDatetime && formData.admissionReason && formData.attendingDoctor && formData.presumptiveDiagnosis && formData.clinicalSummary;
        return true;
    }, [currentStep, beneficiary, formData]);

    const nextStep = () => {
        if (canGoToNextStep) {
            setCurrentStep(prev => Math.min(prev + 1, stepNames.length));
        } else {
            toast.error(currentStep === 1 ? 'Debe seleccionar un beneficiario ACTIVO para continuar.' : 'Por favor, complete todos los campos obligatorios para continuar.');
        }
    };
    
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const toastId = toast.loading('Enviando notificación...');
        try {
            const dataToSubmit = new FormData();
            const detailsPayload = { beneficiary, formData };
            dataToSubmit.append('details', JSON.stringify(detailsPayload));
            for (const file of files) {
                dataToSubmit.append('files', file);
            }
            const response = await fetch('/api/portal/internments', { 
                method: 'POST', 
                body: dataToSubmit,
                credentials: 'same-origin', // Aseguramos que se envíe la cookie de autenticación
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falló el envío.');
            }
            toast.success('Notificación enviada con éxito.', { id: toastId });
            onSuccess();
        } catch (error) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full">
            <div className="p-8">
                <ProgressBar currentStep={currentStep} steps={stepNames} />
            </div>
            <form id="notification-form" className="p-8 pt-0" onSubmit={handleSubmit}>
                <div className={currentStep === 1 ? 'block' : 'hidden'}>
                    <h2 className="text-xl font-semibold text-gray-700 mb-6">Paso 1: Buscar y confirmar beneficiario</h2>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="beneficiary-search" className="block mb-2 text-sm font-medium text-gray-700">Buscar por DNI o Número de Afiliado</label>
                            <div className="flex items-center gap-2">
                                <input type="text" id="beneficiary-search" value={beneficiarySearch} onChange={(e) => setBeneficiarySearch(e.target.value)} className="w-full px-4 py-2 border rounded-md" placeholder="Ingrese DNI o N° de Afiliado..." />
                                <button type="button" onClick={handleSearchBeneficiary} disabled={loadingBeneficiary} className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
                                    {loadingBeneficiary ? '...' : 'Buscar'}
                                </button>
                            </div>
                        </div>
                        {beneficiary && (
                            <div className={`p-6 border rounded-lg ${beneficiary.activo ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold text-gray-800">Beneficiario Encontrado</h3>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${beneficiary.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {beneficiary.activo ? <CheckCircleIcon className="w-4 h-4 mr-1.5" /> : <XCircleIcon className="w-4 h-4 mr-1.5" />}
                                        {beneficiary.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="font-medium text-gray-600">Nombre:</span> {beneficiary.nombre}</div>
                                    <div><span className="font-medium text-gray-600">DNI:</span> {beneficiary.numeroDeDocumento}</div>
                                    <div><span className="font-medium text-gray-600">CUIL:</span> {beneficiary.cuil}</div>
                                    <div><span className="font-medium text-gray-600">Plan:</span> {beneficiary.fSssTipoDeBeneficiario?.nombre.toLowerCase().includes('relacion de dependencia') ? 'PLATINO' : 'BORDO'}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className={currentStep === 2 ? 'block' : 'hidden'}>
                    <h2 className="text-xl font-semibold text-gray-700 mb-6">Paso 2: Completar datos del evento</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Carácter</label>
                            <div className="flex space-x-4">
                                <label className="flex items-center p-3 border rounded-md flex-1 cursor-pointer hover:bg-gray-50">
                                    <input type="radio" name="internmentType" value="urgencia" onChange={handleInputChange} checked={formData.internmentType === 'urgencia'} className="mr-2 text-indigo-600"/>
                                    Urgencia
                                </label>
                                <label className="flex items-center p-3 border rounded-md flex-1 cursor-not-allowed bg-gray-100 opacity-60" title="Las internaciones programadas se gestionan internamente por la obra social.">
                                    <input type="radio" name="internmentType" value="programada" className="mr-2" disabled/>
                                    <span className="flex flex-col">
                                        <span>Programada</span>
                                        <span className="text-xs text-gray-500">Gestión interna</span>
                                    </span>
                                </label>
                            </div>
                        </div>
                        <div><label htmlFor="admissionDatetime" className="block mb-2 text-sm font-medium text-gray-700">Fecha y Hora de Ingreso</label><input type="datetime-local" id="admissionDatetime" value={formData.admissionDatetime} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-md"/></div>
                        <div><label htmlFor="admissionType" className="block mb-2 text-sm font-medium text-gray-700">Tipo de Ingreso</label><select id="admissionType" value={formData.admissionType} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-md"><option>Guardia</option><option>Consultorio Externo</option><option>Derivación</option></select></div>
                        <div><label htmlFor="admissionSector" className="block mb-2 text-sm font-medium text-gray-700">Sector de Internación</label><select id="admissionSector" value={formData.admissionSector} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-md"><option>Sala General</option><option>Terapia Intensiva (UTI)</option><option>Unidad Coronaria (UCO)</option><option>Pediatría</option><option>Maternidad</option></select></div>
                        <div><label htmlFor="admissionReason" className="block mb-2 text-sm font-medium text-gray-700">Motivo (Resumen)</label><input type="text" id="admissionReason" value={formData.admissionReason} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-md" placeholder="Ej: Dolor abdominal agudo"/></div>
                        <div><label htmlFor="attendingDoctor" className="block mb-2 text-sm font-medium text-gray-700">Médico a Cargo</label><input type="text" id="attendingDoctor" value={formData.attendingDoctor} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-md" placeholder="Dr. Nombre Apellido (Mat. 12345)"/></div>
                        <div><label htmlFor="roomNumber" className="block mb-2 text-sm font-medium text-gray-700">Habitación / Cama <span className="text-gray-500 font-normal">(Opcional)</span></label><input type="text" id="roomNumber" value={formData.roomNumber} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-md" placeholder="Ej: 305B"/></div>
                        <div className="md:col-span-2"><label htmlFor="presumptiveDiagnosis" className="block mb-2 text-sm font-medium text-gray-700">Diagnóstico Presuntivo (CIE-10)</label><input type="text" id="presumptiveDiagnosis" value={formData.presumptiveDiagnosis} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-md" placeholder="Buscar por código o descripción"/></div>
                        <div className="md:col-span-2"><label htmlFor="clinicalSummary" className="block mb-2 text-sm font-medium text-gray-700">Resumen de Historia Clínica</label><textarea id="clinicalSummary" rows="4" value={formData.clinicalSummary} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-md" placeholder="Describa el padecimiento actual, antecedentes y examen físico."></textarea></div>
                    </div>
                </div>
                <div className={currentStep === 3 ? 'block' : 'hidden'}>
                    <h2 className="text-xl font-semibold text-gray-700 mb-6">Paso 3: Adjuntar documentación y comentarios</h2>
                    <div className="space-y-6">
                        <DropZone files={files} setFiles={setFiles} />
                        <div>
                            <label htmlFor="additionalComments" className="block mb-2 text-sm font-medium text-gray-700">Comentarios Adicionales <span className="text-gray-500 font-normal">(Opcional)</span></label>
                            <textarea id="additionalComments" rows="4" value={formData.additionalComments} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-md" placeholder="Añada cualquier información relevante..."></textarea>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-200">
                    <button type="button" id="prev-btn" onClick={prevStep} disabled={currentStep === 1} className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50">Anterior</button>
                    {currentStep < stepNames.length ? (
                        <button type="button" id="next-btn" onClick={nextStep} disabled={!canGoToNextStep} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50">Siguiente</button>
                    ) : (
                        <button type="submit" id="submit-btn" disabled={isSubmitting} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50">
                            {isSubmitting ? 'Enviando...' : 'Enviar Notificación'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
