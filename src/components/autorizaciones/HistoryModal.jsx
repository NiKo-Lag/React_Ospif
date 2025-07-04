// src/components/autorizaciones/HistoryModal.jsx

"use client";

import { XMarkIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

export default function HistoryModal({ cuil, history = [], onClose }) {
  const statusColors = {
    'Autorizadas': 'bg-green-100 text-green-800',
    'Rechazadas': 'bg-red-100 text-red-800',
    'En Auditoría': 'bg-yellow-100 text-yellow-800',
    'Nuevas Solicitudes': 'bg-blue-100 text-blue-800',
    'default': 'bg-gray-100 text-gray-800'
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-center items-center backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white/85 backdrop-blur-lg border border-white/30 rounded-lg shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <h2 className="text-lg font-semibold text-gray-800">
            Historial para CUIL: <span className="font-bold text-indigo-600">{cuil}</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {history.map(auth => (
            <div key={auth.id} className="p-3 border rounded-md bg-white/70">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-sm text-gray-900">{auth.title}</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[auth.status] || statusColors.default}`}>
                  {auth.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">ID: {auth.id} | Fecha: {auth.date}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/20 bg-white/50 flex justify-end">
          <button onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 shadow-sm">
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}