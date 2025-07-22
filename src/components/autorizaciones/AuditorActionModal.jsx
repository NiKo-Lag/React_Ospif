// src/components/autorizaciones/AuditorActionModal.jsx
"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckIcon, XMarkIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/solid';

const DetailItem = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
    </div>
);

export default function AuditorActionModal({ request, closeModal, onSuccess }) {
    const [auditorComment, setAuditorComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (action) => {
        setIsSubmitting(true);
        const toastId = toast.loading(`Procesando acción: ${action}...`);

        try {
            const response = await fetch(`/api/auditor/authorizations/${request.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: action,
                    comment: auditorComment,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `No se pudo ${action.toLowerCase()} la solicitud.`);
            }

            toast.success(`Solicitud ${action.toLowerCase()} con éxito.`, { id: toastId });
            onSuccess();

        } catch (error) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg max-w-2xl mx-auto">
            <div className="pb-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Auditar Solicitud #{request.id}</h2>
                <p className="text-sm text-gray-500 mt-1">Beneficiario: {request.beneficiary}</p>
            </div>
            
            <div className="py-6 space-y-4">
                <h3 className="font-semibold text-gray-700">Detalles de la Solicitud</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                    <DetailItem label="Práctica Solicitada" value={request.title} />
                    <DetailItem label="Prestador" value={request.provider_name} />
                    <DetailItem label="Fecha de Solicitud" value={request.date} />
                    <DetailItem label="Estado Actual" value={request.status} />
                </dl>
                
                <div className="pt-4">
                    <label htmlFor="auditorComment" className="block text-sm font-medium text-gray-700 mb-1">
                        Comentarios de Auditoría
                    </label>
                    <textarea
                        id="auditorComment"
                        value={auditorComment}
                        onChange={(e) => setAuditorComment(e.target.value)}
                        rows="4"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Añada sus observaciones, justificación de la decisión, o correcciones a solicitar..."
                    />
                </div>
            </div>

            <div className="pt-6 border-t flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                    onClick={() => handleSubmit('Devolver')}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                    <ArrowUturnLeftIcon className="w-5 h-5 mr-2" />
                    Devolver para Corrección
                </button>
                <div className="flex space-x-3">
                    <button
                        onClick={() => handleSubmit('Rechazar')}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                        <XMarkIcon className="w-5 h-5 mr-2" />
                        Rechazar
                    </button>
                    <button
                        onClick={() => handleSubmit('Aprobar')}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                        <CheckIcon className="w-5 h-5 mr-2" />
                        Aprobar
                    </button>
                </div>
            </div>
        </div>
    );
} 