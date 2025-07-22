// src/components/ui/Modal.jsx

"use client";

import { motion } from 'framer-motion'; // Importamos framer-motion para animaciones

export default function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-center backdrop-blur-md bg-black/30" // CORREGIDO: z-40 a z-50
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden" // AUMENTADO: max-w-3xl a max-w-6xl
        style={{
          // Estilos para simular el "vidrio líquido"
          backgroundColor: 'rgba(255, 255, 255, 0.85)', // Fondo ligeramente transparente
          backdropFilter: 'blur(10px)', // Efecto de desenfoque del fondo
          WebkitBackdropFilter: 'blur(10px)', // Para navegadores Safari
          border: '1px solid rgba(255, 255, 255, 0.3)', // Borde sutil
        }}
      >
        {children}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    </div>
  );
}