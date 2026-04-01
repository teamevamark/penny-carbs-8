import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChefHat, Home } from 'lucide-react';
import type { ServiceType } from '@/types/database';
import { useActiveServiceTypes } from '@/hooks/useServiceModules';

interface ServiceModule {
  id: ServiceType;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const modules: ServiceModule[] = [
  {
    id: 'indoor_events',
    title: 'Events',
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-indoor-events',
    bgColor: 'bg-indoor-events/10',
  },
  {
    id: 'cloud_kitchen',
    title: 'Cloud Kitchen',
    icon: <ChefHat className="h-5 w-5" />,
    color: 'text-cloud-kitchen',
    bgColor: 'bg-cloud-kitchen/10',
  },
  {
    id: 'homemade',
    title: 'Homemade',
    icon: <Home className="h-5 w-5" />,
    color: 'text-homemade',
    bgColor: 'bg-homemade/10',
  },
];

const OperationalModules: React.FC = () => {
  const navigate = useNavigate();
  const { data: activeTypes, isLoading } = useActiveServiceTypes();

  const filteredModules = activeTypes
    ? modules.filter((m) => activeTypes.includes(m.id))
    : modules;

  const handleModuleClick = (serviceType: ServiceType) => {
    if (serviceType === 'indoor_events') {
      navigate('/indoor-events');
    } else if (serviceType === 'cloud_kitchen') {
      navigate('/cloud-kitchen');
    } else if (serviceType === 'homemade') {
      navigate('/homemade');
    }
  };

  return (
    <div className="sticky top-16 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center justify-around gap-2 px-2 py-2">
        {modules.map((module) => (
          <button
            key={module.id}
            onClick={() => handleModuleClick(module.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] ${module.bgColor}`}
          >
            <span className={module.color}>{module.icon}</span>
            <span className={`text-sm font-medium ${module.color}`}>
              {module.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default OperationalModules;
