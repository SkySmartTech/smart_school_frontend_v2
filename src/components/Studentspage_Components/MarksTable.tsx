// components/MarksTable.tsx
import React from 'react';

// Define the structure for a single subject's marks
interface SubjectMarks {
  subject: string;
  term1: number;
  term2: number;
  term3: number;
}

// Define the props for the MarksTable component
interface MarksTableProps {
  marks: SubjectMarks[]; // An array of subject marks
  // Function to determine the text color based on the grade value
  getGradeColor: (grade: number) => string;
}

/**
 * MarksTable component displays a detailed table of student marks across different subjects and terms.
 * It applies color-coding to grades for quick visual assessment.
 *
 * @param {MarksTableProps} { marks, getGradeColor } - Props for the component.
 * @returns {JSX.Element} A React component rendering the marks table.
 */
const MarksTable: React.FC<MarksTableProps> = ({ marks, getGradeColor }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-blue-900 mb-4">Marks</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-100">
              <th className="text-left p-3 text-blue-900 font-semibold rounded-tl-lg">Subject</th>
              <th className="text-center p-3 text-blue-900 font-semibold">Term 1</th>
              <th className="text-center p-3 text-blue-900 font-semibold">Term 2</th>
              <th className="text-center p-3 text-blue-900 font-semibold rounded-tr-lg">Term 3</th>
            </tr>
          </thead>
          <tbody>
            {/* Map through the marks data to render each subject row */}
            {marks.map((mark, index) => (
              <tr key={index} className="border-b border-blue-50 hover:bg-blue-50">
                <td className="p-3 font-medium text-blue-900">{mark.subject}</td>
                {/* Apply dynamic text color based on grade */}
                <td className={`p-3 text-center ${getGradeColor(mark.term1)}`}>{mark.term1}</td>
                <td className={`p-3 text-center ${getGradeColor(mark.term2)}`}>{mark.term2}</td>
                <td className={`p-3 text-center ${getGradeColor(mark.term3)}`}>{mark.term3}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarksTable;
