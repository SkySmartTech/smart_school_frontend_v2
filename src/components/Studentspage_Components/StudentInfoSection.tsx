// components/StudentInfoSection.tsx
import React from 'react';
import DashboardCard from './DashboardCard'; // Import the generic DashboardCard component

// Define the props for the StudentInfoSection component
interface StudentInfoSectionProps {
  name: string; // Student's name
  grade: string; // Student's grade
  average: number; // Student's average marks
  classPosition: number; // Student's position in class
}

/**
 * StudentInfoSection component displays key student information like name, grade,
 * overall average, and class position. It uses the DashboardCard for consistent styling.
 *
 * @param {StudentInfoSectionProps} { name, grade, average, classPosition } - Props for the component.
 * @returns {JSX.Element} A React component rendering student information cards.
 */
const StudentInfoSection: React.FC<StudentInfoSectionProps> = ({ name, grade, average, classPosition }) => {
  return (
    <>
      {/* Current Year Card */}
      <DashboardCard title="Current Year" borderColor="border-blue-500">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-blue-600">Student Name</p>
            <p className="text-xl font-bold text-blue-900">{name}</p>
          </div>
          <div>
            <p className="text-sm text-blue-600">Grade</p>
            <p className="text-lg font-semibold text-blue-800">{grade}</p>
          </div>
        </div>
      </DashboardCard>

      {/* Average Card */}
      <DashboardCard title="Average" borderColor="border-blue-500">
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-900">{average}%</p>
          <p className="text-sm text-blue-600 mt-1">
            Position: {classPosition} of class
          </p>
        </div>
      </DashboardCard>
    </>
  );
};

export default StudentInfoSection;
