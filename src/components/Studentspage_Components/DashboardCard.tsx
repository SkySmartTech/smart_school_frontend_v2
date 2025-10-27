// components/DashboardCard.tsx
import React from 'react';

// Define the props for the DashboardCard component
interface DashboardCardProps {
  title: string; // The title to display at the top of the card
  children: React.ReactNode; // The content to be rendered inside the card
  borderColor?: string; // Optional Tailwind CSS class for the left border color (e.g., 'border-blue-500')
}

/**
 * DashboardCard component provides a consistent styled container for various dashboard sections.
 * It features a title, a left border for visual emphasis, and accepts any React children as its content.
 *
 * @param {DashboardCardProps} { title, children, borderColor = 'border-blue-500' } - Props for the component.
 * @returns {JSX.Element} A React component rendering a styled card.
 */
const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, borderColor = 'border-blue-500' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${borderColor}`}>
      {/* Card title */}
      <h2 className="text-lg font-semibold text-blue-900 mb-3">{title}</h2>
      {/* Content rendered inside the card */}
      {children}
    </div>
  );
};

export default DashboardCard;
