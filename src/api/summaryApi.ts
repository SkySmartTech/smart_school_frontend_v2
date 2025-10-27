import axios from "axios";

export interface SummarySubjectData {
  name: string;
  value: number;
}

export interface SummaryClassData {
  name: string;
  marks: number;
}

export interface SummaryTableRow {
  class: string;
  sinhala: number;
  english: number;
  maths: number;
  science: number;
}

export interface SummaryData {
  subjectData: SummarySubjectData[];
  classData: SummaryClassData[];
  tableData: SummaryTableRow[];
}

export const fetchSummaryData = async (
  year: string,
  grade: string,
  term: string
): Promise<SummaryData> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL}/api/summary-report`,
    {
      params: { year, grade, term },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        Accept: 'application/json',
      },
    }
  );
  if (!response.data) throw new Error('No data received from server');
  return response.data;
};
