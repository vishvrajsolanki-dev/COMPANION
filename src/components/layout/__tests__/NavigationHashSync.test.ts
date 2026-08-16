import { describe, it, expect } from 'vitest';
import { parseHash } from '../../../hooks/useHashLocation';

describe('Navigation & URL Hash Sync (Milestone 4)', () => {
  describe('parseHash & Legacy Hash Migration', () => {
    it('parses canonical #today route', () => {
      const res = parseHash('#today');
      expect(res.tab).toBe('home');
      expect(res.subview).toBeNull();
      expect(res.hash).toBe('#today');
    });

    it('migrates legacy #home -> #today', () => {
      const res = parseHash('#home');
      expect(res.tab).toBe('home');
      expect(res.subview).toBeNull();
      expect(res.hash).toBe('#today');
    });

    it('migrates legacy #schedule -> #plan/timetable', () => {
      const res = parseHash('#schedule');
      expect(res.tab).toBe('schedule');
      expect(res.subview).toBeNull();
      expect(res.hash).toBe('#plan/timetable');
    });

    it('migrates legacy #tasks -> #study/tasks', () => {
      const res = parseHash('#tasks');
      expect(res.tab).toBe('tasks');
      expect(res.subview).toBeNull();
      expect(res.hash).toBe('#study/tasks');
    });

    it('migrates legacy #notes -> #study/notes', () => {
      const res = parseHash('#notes');
      expect(res.tab).toBe('tasks');
      expect(res.subview).toBe('notes');
      expect(res.hash).toBe('#study/notes');
    });

    it('migrates legacy #exams -> #study/exams', () => {
      const res = parseHash('#exams');
      expect(res.tab).toBe('tasks');
      expect(res.subview).toBe('exams');
      expect(res.hash).toBe('#study/exams');
    });

    it('migrates legacy #resources -> #study/resources', () => {
      const res = parseHash('#resources');
      expect(res.tab).toBe('tasks');
      expect(res.subview).toBe('resources');
      expect(res.hash).toBe('#study/resources');
    });

    it('migrates legacy #analytics -> #study/analytics', () => {
      const res = parseHash('#analytics');
      expect(res.tab).toBe('tasks');
      expect(res.subview).toBe('analytics');
      expect(res.hash).toBe('#study/analytics');
    });

    it('migrates legacy #attendance -> #study/attendance', () => {
      const res = parseHash('#attendance');
      expect(res.tab).toBe('tasks');
      expect(res.subview).toBe('attendance');
      expect(res.hash).toBe('#study/attendance');
    });

    it('migrates legacy #profile -> #account', () => {
      const res = parseHash('#profile');
      expect(res.tab).toBe('profile');
      expect(res.subview).toBeNull();
      expect(res.hash).toBe('#account');
    });

    it('migrates legacy #directory -> #account/faculty', () => {
      const res = parseHash('#directory');
      expect(res.tab).toBe('profile');
      expect(res.subview).toBe('directory');
      expect(res.hash).toBe('#account/faculty');
    });

    it('migrates legacy #manage-subjects -> #plan/subjects', () => {
      const res = parseHash('#manage-subjects');
      expect(res.tab).toBe('schedule');
      expect(res.subview).toBe('manage-subjects');
      expect(res.hash).toBe('#plan/subjects');
    });

    it('migrates legacy #timetable-builder -> #plan/builder', () => {
      const res = parseHash('#timetable-builder');
      expect(res.tab).toBe('schedule');
      expect(res.subview).toBe('timetable-builder');
      expect(res.hash).toBe('#plan/builder');
    });

    it('migrates legacy #semester-setup -> #plan/semester', () => {
      const res = parseHash('#semester-setup');
      expect(res.tab).toBe('schedule');
      expect(res.subview).toBe('semester-setup');
      expect(res.hash).toBe('#plan/semester');
    });

    it('migrates legacy #admin-portal -> #account/admin', () => {
      const res = parseHash('#admin-portal');
      expect(res.tab).toBe('profile');
      expect(res.subview).toBe('admin-portal');
      expect(res.hash).toBe('#account/admin');
    });

    it('migrates legacy #calendar-events -> #plan/calendar', () => {
      const res = parseHash('#calendar-events');
      expect(res.tab).toBe('schedule');
      expect(res.subview).toBe('calendar-events');
      expect(res.hash).toBe('#plan/calendar');
    });

    it('parses canonical #plan/timetable route', () => {
      const res = parseHash('#plan/timetable');
      expect(res.tab).toBe('schedule');
      expect(res.subview).toBeNull();
      expect(res.hash).toBe('#plan/timetable');
    });

    it('parses canonical #study/tasks route', () => {
      const res = parseHash('#study/tasks');
      expect(res.tab).toBe('tasks');
      expect(res.subview).toBeNull();
      expect(res.hash).toBe('#study/tasks');
    });

    it('parses canonical #account route', () => {
      const res = parseHash('#account');
      expect(res.tab).toBe('profile');
      expect(res.subview).toBeNull();
      expect(res.hash).toBe('#account');
    });

    it('parses #account/faculty subview', () => {
      const res = parseHash('#account/faculty');
      expect(res.tab).toBe('profile');
      expect(res.subview).toBe('directory');
      expect(res.hash).toBe('#account/faculty');
    });

    it('parses direct deep-link to #account/admin', () => {
      const res = parseHash('#account/admin');
      expect(res.tab).toBe('profile');
      expect(res.subview).toBe('admin-portal');
      expect(res.hash).toBe('#account/admin');
    });

    it('preserves query parameters in canonical hash', () => {
      const res = parseHash('#study/notes?noteId=note-999&subjectId=cs301');
      expect(res.tab).toBe('tasks');
      expect(res.subview).toBe('notes');
      expect(res.params.noteId).toBe('note-999');
      expect(res.params.subjectId).toBe('cs301');
      expect(res.hash).toBe('#study/notes?noteId=note-999&subjectId=cs301');
    });

    it('defaults empty hash to #today state', () => {
      const res = parseHash('');
      expect(res.tab).toBe('home');
      expect(res.subview).toBeNull();
      expect(res.hash).toBe('#today');
    });

    it('is case-insensitive for hash matching', () => {
      const res = parseHash('#HOME');
      expect(res.tab).toBe('home');
    });
  });
});
