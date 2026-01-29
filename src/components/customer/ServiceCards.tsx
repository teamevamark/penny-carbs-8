import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, ChefHat, Home } from 'lucide-react';
import type { ServiceType } from '@/types/database';

interface ServiceCardData {
  id: ServiceType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

const services: ServiceCardData[] = [
  {
    id: 'indoor_events',
    title: 'Indoor Events',
    subtitle: 'Catering for parties & events',
    icon: <Calendar className="h-8 w-8" />,
    color: 'text-indoor-events',
    bgGradient: 'from-indoor-events/10 to-indoor-events/5',
  },
  {
    id: 'cloud_kitchen',
    title: 'Cloud Kitchen',
    subtitle: 'Professional chef meals',
    icon: <ChefHat className="h-8 w-8" />,
    color: 'text-cloud-kitchen',
    bgGradient: 'from-cloud-kitchen/10 to-cloud-kitchen/5',
  },
  {
    id: 'homemade',
    title: 'Homemade Food',
    subtitle: 'Fresh home-cooked meals',
    icon: <Home className="h-8 w-8" />,
    color: 'text-homemade',
    bgGradient: 'from-homemade/10 to-homemade/5',
  },
];

const ServiceCards: React.FC = () => {
  const navigate = useNavigate();

  const handleServiceClick = (serviceType: ServiceType) => {
    // Each service has its own booking flow
    if (serviceType === 'indoor_events') {
      navigate('/book-event');
    } else if (serviceType === 'cloud_kitchen') {
      navigate('/cloud-kitchen');
    } else if (serviceType === 'homemade') {
      navigate('/homemade');
    }
  };

  return (
    <section className="px-4 py-6">
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
        What are you looking for?
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {services.map((service) => (
          <Card
            key={service.id}
            className={`cursor-pointer overflow-hidden bg-gradient-to-br ${service.bgGradient} transition-all hover:scale-[1.02] hover:shadow-lg`}
            onClick={() => handleServiceClick(service.id)}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-xl bg-card p-3 shadow-sm ${service.color}`}>
                {service.icon}
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">
                  {service.title}
                </h3>
                <p className="text-sm text-muted-foreground">{service.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default ServiceCards;
