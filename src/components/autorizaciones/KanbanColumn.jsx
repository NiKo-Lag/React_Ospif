// src/components/autorizaciones/KanbanColumn.jsx

import React from 'react';

const KanbanColumn = ({ title, children }) => {
  return (
    <div className="bg-gray-100/70 rounded-xl p-4 flex flex-col">
      <h2 className="text-sm font-bold text-gray-600 mb-4 px-1 tracking-wider uppercase">
        {title}
      </h2>
      
      {/* --- CORRECCIÓN: Se eliminó la clase 'flex-grow' de este div --- */}
      <div className="space-y-4"> 
        {React.Children.count(children) > 0 ? (
          children
        ) : (
          <div className="text-center text-xs text-gray-400 mt-4 pt-4">
            No hay solicitudes en esta columna.
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
