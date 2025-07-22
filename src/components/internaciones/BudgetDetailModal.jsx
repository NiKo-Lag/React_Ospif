"use client";

import { XMarkIcon } from '@heroicons/react/24/solid';
import { CalendarDaysIcon, UserCircleIcon, ChatBubbleLeftRightIcon, InformationCircleIcon, PaperClipIcon } from '@heroicons/react/24/outline';

const DetailItem = ({ icon: Icon, label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500 flex items-center">
            <Icon className="w-5 h-5 mr-2 text-gray-400" />
            <span>{label}</span>
        </dt>
        <dd className="mt-1 text-sm text-gray-900 pl-7">{value || 'No especificado'}</dd>
    </div>
);

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(value || 0);
};

export default function BudgetDetailModal({ budget, onClose }) {
    if (!budget) return null;

    const totalAmount = budget.concepts.reduce((sum, item) => sum + (item.quantity * item.value), 0);

    return (
        <div className="flex flex-col h-full bg-gray-50 max-h-[90vh]">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
                <h2 className="text-xl font-semibold text-gray-800">Detalle de Solicitud de Presupuesto</h2>
                <button type="button" onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                </button>
            </header>

            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                <section className="p-4 border rounded-lg bg-white">
                    <h3 className="font-semibold text-lg mb-4 text-gray-800">Información General</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        <DetailItem icon={CalendarDaysIcon} label="Fecha de Solicitud" value={new Date(budget.requested_at).toLocaleString('es-ES')} />
                        <DetailItem icon={UserCircleIcon} label="Solicitado por (Prestador)" value={budget.requested_by_provider_name} />
                        <DetailItem icon={UserCircleIcon} label="Administrativo" value={budget.requester_name} />
                        <DetailItem icon={InformationCircleIcon} label="Comentarios Adicionales" value={budget.comments} />
                    </dl>
                </section>

                <section className="p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg text-gray-800">Conceptos Detallados</h3>
                        <p className="text-xl font-bold text-gray-800">{formatCurrency(totalAmount)}</p>
                    </div>
                    <ul className="divide-y divide-gray-200">
                        {budget.concepts.map((item, index) => (
                            <li key={index} className="py-2 flex justify-between">
                                <span>{item.quantity} x {item.concept}</span>
                                <span>{formatCurrency(item.value)} c/u</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {budget.attachments && budget.attachments.length > 0 && (
                     <section className="p-4 border rounded-lg bg-white">
                        <h3 className="font-semibold text-lg mb-3 text-gray-800">Archivos Adjuntos</h3>
                        <ul className="divide-y divide-gray-200">
                            {budget.attachments.map((doc, index) => (
                                <li key={index} className="py-2 flex items-center">
                                    <PaperClipIcon className="w-5 h-5 mr-3 text-gray-400" />
                                    <a href={`/api/files/${doc.filename}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                        {doc.originalFilename || doc.filename}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>

            <footer className="flex-shrink-0 p-4 border-t flex justify-end bg-gray-100 rounded-b-lg">
                <button type="button" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">
                    Cerrar
                </button>
            </footer>
        </div>
    );
} 