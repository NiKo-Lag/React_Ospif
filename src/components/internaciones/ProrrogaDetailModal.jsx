// src/components/internaciones/ProrrogaDetailModal.jsx

"use client";

import { XMarkIcon, CalendarDaysIcon, UserCircleIcon, ChatBubbleLeftRightIcon, InformationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const DetailItem = ({ icon: Icon, label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500 flex items-center">
            <Icon className="w-5 h-5 mr-2 text-gray-400" />
            <span>{label}</span>
        </dt>
        <dd className="mt-1 text-sm text-gray-900 pl-7">{value || 'No especificado'}</dd>
    </div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        'Pendiente de Auditoría': 'bg-yellow-100 text-yellow-800',
        'Aceptada': 'bg-green-100 text-green-800',
        'Rechazada': 'bg-red-100 text-red-800',
        'default': 'bg-gray-100 text-gray-800',
    };
    const color = styles[status] || styles.default;
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
            <ClockIcon className="w-4 h-4 mr-1.5" />
            {status}
        </span>
    );
};


export default function ProrrogaDetailModal({ proroga, onClose }) {
    if (!proroga) return null;

    return (
        <div className="flex flex-col h-full bg-gray-50 max-h-[90vh]">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
                <h2 className="text-xl font-semibold text-gray-800">Detalle de Solicitud de Prórroga</h2>
                <button type="button" onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                </button>
            </header>

            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                <div className="p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg mb-4 text-gray-800">Información de la Solicitud</h3>
                        <StatusBadge status={proroga.status} />
                    </div>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        <DetailItem icon={CalendarDaysIcon} label="Fecha de Solicitud" value={new Date(proroga.requested_at).toLocaleString('es-ES')} />
                        <DetailItem icon={ClockIcon} label="Días Solicitados" value={`${proroga.requested_days} días`} />
                        <DetailItem icon={UserCircleIcon} label="Médico Solicitante" value={proroga.requesting_doctor} />
                        <DetailItem icon={ChatBubbleLeftRightIcon} label="Motivo Clínico" value={proroga.reason} />
                        <DetailItem icon={InformationCircleIcon} label="Observaciones" value={proroga.observations} />
                    </dl>
                </div>

                <div className="p-4 border rounded-lg bg-white">
                     <h3 className="font-semibold text-lg mb-3 text-gray-800">Resolución de Auditoría</h3>
                     {proroga.status !== 'Pendiente de Auditoría' ? (
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                            <DetailItem icon={UserCircleIcon} label="Auditor" value={proroga.auditor_id || 'No disponible'} />
                            <DetailItem icon={CalendarDaysIcon} label="Fecha de Auditoría" value={proroga.audited_at ? new Date(proroga.audited_at).toLocaleString('es-ES') : 'N/A'} />
                            <DetailItem icon={ChatBubbleLeftRightIcon} label="Comentarios del Auditor" value={proroga.auditor_comment || 'Sin comentarios.'} />
                        </dl>
                     ) : (
                        <p className="text-sm text-gray-500">Esta solicitud aún no ha sido auditada.</p>
                     )}
                </div>
            </main>

            <footer className="flex-shrink-0 p-4 border-t flex justify-end bg-gray-100 rounded-b-lg">
                <button type="button" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">
                    Cerrar
                </button>
            </footer>
        </div>
    );
} 