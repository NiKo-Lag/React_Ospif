// src/components/internaciones/InternmentForm.jsx

"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/solid';

const FormField = ({ label, children, htmlFor }) => (
    <div>
        <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);

export default function InternmentForm({ onSuccess, closeModal }) {
    const [formData, setFormData] = useState({
        beneficiaryCuil: '',
        admissionDate: '',
        type: 'Programada',
        reason: '',
        requestingDoctor: '',
        notifyingProviderId: '',
    });
    
    const [beneficiary, setBeneficiary] = useState(null);
    const [providers, setProviders] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingBeneficiary, setLoadingBeneficiary] = useState(false);
    const [beneficiaryError, setBeneficiaryError] = useState('');

    useEffect(() => {
        async function fetchProviders() {
            try {
                const response = await fetch('/api/prestadores/all');
                if (!response.ok) throw new Error('No se pudieron cargar los prestadores.');
                const data = await response.json();
                setProviders(data);
            } catch (error) {
                console.error("Error al cargar prestadores:", error);
                toast.error("No se pudieron cargar los prestadores.");
            }
        }
        fetchProviders();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchBeneficiary = async () => {
        if (!formData.beneficiaryCuil || !/^\d{11}$/.test(formData.beneficiaryCuil)) {
            setBeneficiaryError('CUIL inválido. Debe contener 11 dígitos sin guiones.');
            return;
        }
        setLoadingBeneficiary(true);
        setBeneficiaryError('');
        setBeneficiary(null);
        try {
            const response = await fetch(`/api/beneficiary/${formData.beneficiaryCuil}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setBeneficiary(data);
            if (!data.activo) toast.error('El beneficiario se encuentra INACTIVO.');
            else toast.success('Beneficiario Activo encontrado.');
        } catch (err) {
            setBeneficiaryError(err.message);
            toast.error(err.message);
        } finally {
            setLoadingBeneficiary(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!beneficiary || !beneficiary.activo) {
            toast.error("Debe seleccionar un beneficiario activo.");
            return;
        }
        
        setIsSubmitting(true);
        
        const submissionData = {
            beneficiary_name: beneficiary.nombre,
            beneficiary_cuil: formData.beneficiaryCuil,
            admissionDate: formData.admissionDate,
            type: formData.type,
            reason: formData.reason,
            requestingDoctor: formData.requestingDoctor,
            notifyingProviderId: formData.notifyingProviderId,
        };

        try {
            // --- CORRECCIÓN: Apuntamos a la URL correcta /api/internment ---
            const response = await fetch('/api/internment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });
            
            if (!response.ok) {
                // Si la respuesta no es JSON, el error se captura aquí
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (parseError) {
                    // Si no se puede parsear, es probable que sea una página de error HTML
                    throw new Error("La API devolvió una respuesta inesperada. Verifique la URL y la ruta del servidor.");
                }
                throw new Error(errorData.message || 'Falló el envío de la denuncia.');
            }
            
            toast.success('¡Internación denunciada con éxito!');
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full bg-gray-50">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
                <h2 className="text-xl font-semibold text-gray-800">Denunciar Nueva Internación</h2>
                <button type="button" onClick={closeModal} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
            </div>

            <div className="flex-grow p-6 space-y-6 overflow-y-auto">
                <div className="p-4 border rounded-lg bg-white">
                    <h3 className="font-semibold text-lg mb-3 text-gray-800">Beneficiario</h3>
                    <FormField label="CUIL" htmlFor="beneficiaryCuil">
                        <div className="flex">
                            <input type="text" id="beneficiaryCuil" name="beneficiaryCuil" value={formData.beneficiaryCuil} onChange={handleInputChange} onBlur={handleSearchBeneficiary} placeholder="Ingrese 11 dígitos sin guiones" className="form-input w-full rounded-r-none" />
                            <button type="button" onClick={handleSearchBeneficiary} disabled={loadingBeneficiary} className="bg-indigo-600 text-white px-4 rounded-r-lg hover:bg-indigo-700 disabled:bg-indigo-300">
                                {loadingBeneficiary ? '...' : 'Buscar'}
                            </button>
                        </div>
                        {beneficiaryError && <p className="text-red-500 text-sm mt-1">{beneficiaryError}</p>}
                    </FormField>
                    {beneficiary && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                            <p><strong className="block text-sm text-gray-500">Nombre:</strong> {beneficiary.nombre}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border rounded-lg bg-white">
                    <h3 className="font-semibold text-lg mb-3 text-gray-800">Detalles de la Internación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Prestador que notifica" htmlFor="notifyingProviderId">
                            <select name="notifyingProviderId" value={formData.notifyingProviderId} onChange={handleInputChange} className="form-select w-full">
                                <option value="">Seleccione un prestador...</option>
                                {providers.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Fecha de Ingreso" htmlFor="admissionDate">
                            <input type="date" name="admissionDate" value={formData.admissionDate} onChange={handleInputChange} className="form-input w-full" />
                        </FormField>
                        <FormField label="Tipo de Internación">
                            <div className="flex items-center space-x-4 mt-2">
                                <label className="flex items-center"><input type="radio" name="type" value="Programada" checked={formData.type === 'Programada'} onChange={handleInputChange} className="form-radio" /> <span className="ml-2">Programada</span></label>
                                <label className="flex items-center"><input type="radio" name="type" value="Urgencia" checked={formData.type === 'Urgencia'} onChange={handleInputChange} className="form-radio" /> <span className="ml-2">Urgencia</span></label>
                            </div>
                        </FormField>
                        <FormField label="Médico que solicita" htmlFor="requestingDoctor">
                            <input type="text" name="requestingDoctor" value={formData.requestingDoctor} onChange={handleInputChange} className="form-input w-full" />
                        </FormField>
                        <div className="md:col-span-2">
                            <FormField label="Motivo de Ingreso" htmlFor="reason">
                                <textarea name="reason" value={formData.reason} onChange={handleInputChange} rows="3" className="form-textarea w-full"></textarea>
                            </FormField>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex-shrink-0 p-4 border-t flex justify-end items-center bg-gray-100 rounded-b-lg">
                <div className="flex space-x-3">
                    <button type="button" onClick={closeModal} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">Cancelar</button>
                    <button type="submit" disabled={isSubmitting || !beneficiary?.activo} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                        {isSubmitting ? 'Guardando...' : 'Guardar Denuncia'}
                    </button>
                </div>
            </div>
        </form>
    );
}
