// components/RecentExamCard.tsx
import React from 'react';
import DashboardCard from './DashboardCard'; // Import the generic DashboardCard component

// Define the props for the RecentExamCard component
interface RecentExamCardProps {
  recentExam: string; // String describing the recent exam and its result
}

/**
 * RecentExamCard component displays information about the student's most recent exam.
 * It uses the DashboardCard for consistent styling.
 *
 * @param {RecentExamCardProps} { recentExam } - Props for the component.
 * @returns {JSX.Element} A React component rendering the recent exam details.
 */
const RecentExamCard: React.FC<RecentExamCardProps> = ({ recentExam }) => {
  return (
    <DashboardCard title="Recent Exam" borderColor="border-green-500">
      <p className="text-blue-800">{recentExam}</p>
    </DashboardCard>
  );
};

export default RecentExamCard;
