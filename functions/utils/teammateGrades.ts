// * Shared grade map object
const gradeMap: { [key: string]: number } = {
  'A+': 4.3,
  A: 4,
  'A-': 3.7,
  'B+': 3.3,
  B: 3,
  'B-': 2.7,
  'C+': 2.3,
  C: 2,
  'C-': 1.7,
  'D+': 1.3,
  D: 1,
  'D-': 0.7,
  F: 0
};

// * Function that takes in a teammate grade and returns the corresponding numeric value.
export const mapTeammateGradeToValue = (grade: string): number => {
  return gradeMap[grade] || 0;
};

// * Function that takes a teammate grade value and returns the string representation of the grade.
export const mapTeammateValueToGrade = (value: number): string => {
  // Find the closest grade in the gradeMap object
  const grade = Object.keys(gradeMap).reduce((prev, curr) =>
    Math.abs(gradeMap[curr] - value) < Math.abs(gradeMap[prev] - value) ? curr : prev
  );

  return grade || '';
};

// * Return formatted teammate grade string. (Remove special characters except for + and -, uppercase, trim, and remove numbers)
export const formatPossibleTeammateGrade = (grade: string): string => {
  return grade
    .replace(/[^A-Za-z+-]/g, '')
    .toUpperCase()
    .trim();
};

// * Function that checks if a value is a valid teammate grade
export const isValidTeammateGrade = (grade: string | undefined | number): boolean => {
  if (typeof grade === 'number' || !grade) {
    return false;
  }
  const formattedGrade = formatPossibleTeammateGrade(grade);
  // * Check if the grade is a string and if it is in the list of valid grades
  return Object.keys(gradeMap).includes(formattedGrade);
};

export default {
  mapTeammateGradeToValue,
  mapTeammateValueToGrade,
  formatPossibleTeammateGrade,
  isValidTeammateGrade
};
