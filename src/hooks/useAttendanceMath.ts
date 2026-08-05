import { useMemo } from 'react';
import { useSubjects, useLectureSlots, useAttendanceRecords } from '../db/useDatabase';
import { calculateSubjectAttendance, calculateOverallAttendance, SubjectAttendanceResult } from '../utils/attendanceMath';

export function useAttendanceMath() {
  const subjects = useSubjects() || [];
  const lectureSlots = useLectureSlots() || [];
  const attendanceRecords = useAttendanceRecords() || [];

  const subjectResults = useMemo(() => {
    return subjects.map(subject =>
      calculateSubjectAttendance(subject.id, lectureSlots, attendanceRecords)
    );
  }, [subjects, lectureSlots, attendanceRecords]);

  const overall = useMemo(() => {
    return calculateOverallAttendance(subjectResults);
  }, [subjectResults]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, SubjectAttendanceResult>();
    for (const res of subjectResults) {
      map.set(res.subjectId, res);
    }
    return map;
  }, [subjectResults]);

  return {
    subjects,
    subjectResults,
    subjectMap,
    overall,
  };
}
