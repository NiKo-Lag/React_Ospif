// src/components/internaciones/FinalizeInternmentModal.jsx

"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/solid';

export default function FinalizeInternmentModal({ internmentId, onSuccess, closeModal }) {
    const [formData, setFormData] = useState({
        egreso_date: '',
        egreso_reason: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.egreso_date || !formData.egreso_reason) {
            toast.error('La fecha de egreso y el motivo son obligatorios.');
            return;
        }
        setIsSubmitting(true);
        const toastId = toast.loading('Finalizando internación...');
        
        try {
            const response = await fetch(`/api/portal/internments/${internmentId}/finalize`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'same-origin',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudo finalizar la internación.');
            }

            toast.success('Internación finalizada con éxito.', { id: toastId });
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
                <h2 className="text-xl font-semibold text-gray-800">Finalizar Internación #{internmentId}</h2>
                <button type="button" onClick={closeModal} className="p-1 rounded-full text-gray-400 hover:bg-gray-200"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            
            <div>
                <label htmlFor="egreso_date" className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora de Egreso</label>
                <input
                    type="datetime-local"
                    name="egreso_date"
                    id="egreso_date"
                    value={formData.egreso_date}
                    onChange={handleInputChange}
                    className="form-input w-full"
                    required
                />
            </div>

            <div>
                <label htmlFor="egreso_reason" className="block text-sm font-medium text-gray-700 mb-1">Motivo / Diagnóstico de Egreso</label>
                <textarea
                    name="egreso_reason"
                    id="egreso_reason"
                    rows="4"
                    value={formData.egreso_reason}
                    onChange={handleInputChange}
                    className="form-textarea w-full"
                    placeholder="Ej: Alta médica, derivación a otro centro, etc."
                    required
                />
            </div>

            <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                    {isSubmitting ? 'Finalizando...' : 'Finalizar Internación'}
                </button>
            </div>
        </form>
    );
} 