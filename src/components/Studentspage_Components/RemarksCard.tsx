// components/RemarksCard.tsx
import React from 'react';
import DashboardCard from './DashboardCard'; // Import the generic DashboardCard component

// Define the props for the RemarksCard component
interface RemarksCardProps {
  remarks: string; // The remark string (e.g., "Good Progress", "Needs Improvement")
  // Function to determine the background color based on the remark
  getRemarkColor: (remark: string) => string;
}

/**
 * RemarksCard component displays student remarks along with a color-coded indicator.
 * It uses the DashboardCard for consistent styling.
 *
 * @param {RemarksCardProps} { remarks, getRemarkColor } - Props for the component.
 * @returns {JSX.Element} A React component rendering the student's remarks.
 */
const RemarksCard: React.FC<RemarksCardProps> = ({ remarks, getRemarkColor }) => {
  return (
    <DashboardCard title="Remarks" borderColor="border-purple-500">
      <div className="flex items-center space-x-3">
        {/* Color-coded circle based on the remark */}
        <div className={`w-4 h-4 rounded-full ${getRemarkColor(remarks)}`}></div>
        {/* The remark text */}
        <p className="text-blue-800 font-medium">{remarks}</p>
      </div>
    </DashboardCard>
  );
};

export default RemarksCard;
