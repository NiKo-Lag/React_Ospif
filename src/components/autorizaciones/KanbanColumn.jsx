// src/components/autorizaciones/KanbanColumn.jsx

import KanbanCard from './KanbanCard';

export default function KanbanColumn({ title, cards = [], onViewDetails }) {
  return (
    <div className="bg-gray-100 rounded-lg p-3">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
          {cards.length}
        </span>
      </div>
      <div className="space-y-3">
        {cards.map(auth => (
          <KanbanCard 
            key={auth.id} 
            auth={auth} 
            onViewDetails={onViewDetails} 
          />
        ))}
      </div>
    </div>
  );
}