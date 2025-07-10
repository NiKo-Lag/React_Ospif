// src/components/internaciones/InternmentDetailModal.jsx

"use client";

import { XMarkIcon, CalendarIcon, UserIcon, BuildingOffice2Icon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

// Pequeño componente para mostrar un campo de detalle
const DetailField = ({ icon, label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500 flex items-center">
            {icon}
            <span className="ml-2">{label}</span>
        </dt>
        <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
    </div>
);

// --- 1. Recibimos la nueva prop 'onAttachPractice' ---
export default function InternmentDetailModal({ request, onClose, onAttachPractice }) {
    if (!request) return null;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
                <h2 className="text-xl font-semibold text-gray-800">Detalle de Internación: #{request.id}</h2>
                <button type="button" onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                </button>
            </div>

            <div className="flex-grow p-6 space-y-6 overflow-y-auto">
                {/* Detalles Principales */}
                <div className="p-4 border rounded-lg bg-white">
                    <h3 className="font-semibold text-lg mb-4 text-gray-800">Información General</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                        <DetailField icon={<UserIcon className="h-5 w-5"/>} label="Beneficiario" value={request.beneficiary} />
                        <DetailField icon={<CalendarIcon className="h-5 w-5"/>} label="Fecha de Ingreso" value={request.date} />
                        <DetailField icon={<BuildingOffice2Icon className="h-5 w-5"/>} label="Prestador Notificador" value={request.provider_name} />
                        <div className="md:col-span-2">
                            <DetailField icon={<ClipboardDocumentIcon className="h-5 w-5"/>} label="Motivo de Ingreso" value={request.title} />
                        </div>
                    </dl>
                </div>

                {/* Prácticas y Medicamentos (Aún no implementado) */}
                <div className="p-4 border rounded-lg bg-white">
                     <h3 className="font-semibold text-lg mb-3 text-gray-800">Prácticas y Medicamentos Asociados</h3>
                     <p className="text-sm text-gray-500">Próximamente: Aquí se listarán las prácticas y medicamentos autorizados para esta internación.</p>
                </div>

                 {/* Prórrogas (Aún no implementado) */}
                 <div className="p-4 border rounded-lg bg-white">
                     <h3 className="font-semibold text-lg mb-3 text-gray-800">Historial de Prórrogas</h3>
                     <p className="text-sm text-gray-500">Próximamente: Aquí se mostrará el historial de prórrogas autorizadas.</p>
                </div>
            </div>

            <div className="flex-shrink-0 p-4 border-t flex justify-between items-center bg-gray-100 rounded-b-lg">
                <div>
                    {/* --- 2. El botón ahora llama a la función con el ID de la internación --- */}
                    <button 
                        onClick={() => onAttachPractice(request.id)}
                        className="bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors mr-2"
                    >
                        Adjuntar Práctica
                    </button>
                    <button className="bg-yellow-100 text-yellow-700 font-semibold py-2 px-4 rounded-lg hover:bg-yellow-200 transition-colors">Solicitar Prórroga</button>
                </div>
                <button type="button" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">
                    Cerrar
                </button>
            </div>
        </div>
    );
}
