import React from 'react';
import {
  AlertTriangle,
  Building2,
  Car,
  Construction,
  Dog,
  Droplet,
  Droplets,
  Flame,
  HelpCircle,
  OctagonAlert,
  Trash2,
  TreeDeciduous,
  ZapOff,
} from 'lucide-react';
import { IncidentCategory } from '../types';

interface CategoryIconProps {
  category: IncidentCategory;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'w-4 h-4' }) => {
  switch (category) {
    case 'Road Block':
      return <OctagonAlert className={className} />;
    case 'Waterlogging':
      return <Droplets className={className} />;
    case 'Accident':
      return <AlertTriangle className={className} />;
    case 'Fire':
      return <Flame className={className} />;
    case 'Garbage':
      return <Trash2 className={className} />;
    case 'Broken Road':
      return <Construction className={className} />;
    case 'Fallen Tree':
      return <TreeDeciduous className={className} />;
    case 'Power Failure':
      return <ZapOff className={className} />;
    case 'Water Leakage':
      return <Droplet className={className} />;
    case 'Building Damage':
      return <Building2 className={className} />;
    case 'Animal Hazard':
      return <Dog className={className} />;
    case 'Traffic Congestion':
      return <Car className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
};
