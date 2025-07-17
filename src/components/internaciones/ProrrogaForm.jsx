// src/components/internaciones/ProrrogaForm.jsx

"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/solid';

const FormField = ({ label, children, htmlFor }) => (
    <div>
        <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);

export default function ProrrogaForm({ internmentId, onSuccess, closeModal }) {
    const [formData, setFormData] = useState({
        requestedDays: '',
        reason: '',
        requestingDoctor: '',
        observations: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.requestedDays || !formData.reason || !formData.requestingDoctor) {
            toast.error('Los días, el motivo y el médico solicitante son obligatorios.');
            return;
        }
        setIsSubmitting(true);
        const toastId = toast.loading('Enviando solicitud de prórroga...');
        
        try {
            // --- CONEXIÓN CON LA API ---
            const response = await fetch(`/api/portal/internments/${internmentId}/request-extension`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'same-origin',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudo enviar la solicitud de prórroga.');
            }

            toast.success('Solicitud de prórroga enviada con éxito.', { id: toastId });
            onSuccess();
        } catch (error) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Solicitar Prórroga para Internación #{internmentId}</h2>
                <button type="button" onClick={closeModal} className="p-1 rounded-full text-gray-400 hover:bg-gray-200"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Días de Prórroga Solicitados" htmlFor="requestedDays">
                    <input
                        type="number"
                        name="requestedDays"
                        id="requestedDays"
                        value={formData.requestedDays}
                        onChange={handleInputChange}
                        className="form-input w-full"
                        placeholder="Ej: 3"
                    />
                </FormField>
                 <FormField label="Médico Solicitante" htmlFor="requestingDoctor">
                    <input
                        type="text"
                        name="requestingDoctor"
                        id="requestingDoctor"
                        value={formData.requestingDoctor}
                        onChange={handleInputChange}
                        className="form-input w-full"
                        placeholder="Dr. Nombre Apellido"
                    />
                </FormField>
            </div>

            <FormField label="Motivo de la Solicitud" htmlFor="reason">
                <textarea
                    name="reason"
                    id="reason"
                    rows="3"
                    value={formData.reason}
                    onChange={handleInputChange}
                    className="form-textarea w-full"
                    placeholder="Describa el motivo clínico para la extensión..."
                />
            </FormField>

            <FormField label="Observaciones (Opcional)" htmlFor="observations">
                <textarea
                    name="observations"
                    id="observations"
                    rows="3"
                    value={formData.observations}
                    onChange={handleInputChange}
                    className="form-textarea w-full"
                    placeholder="Añada cualquier comentario adicional..."
                />
            </FormField>

            <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                    {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
            </div>
        </form>
    );
}
