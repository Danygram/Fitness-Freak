import type { Exercise } from '../types';

export interface BuiltinTemplate {
  key: string;
  name: string;
  exercises: Exercise[];
}

// A set with default reps/weight (weight 0 = user fills in).
const s = (reps: number, sets = 3): { reps: number; weight: number }[] =>
  Array.from({ length: sets }, () => ({ reps, weight: 0 }));

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    key: 'push',
    name: 'Push Day',
    exercises: [
      { name: 'Bench press', sets: s(8, 4) },
      { name: 'Overhead press', sets: s(10) },
      { name: 'Incline dumbbell press', sets: s(10) },
      { name: 'Lateral raises', sets: s(15) },
      { name: 'Triceps pushdown', sets: s(12) },
    ],
  },
  {
    key: 'pull',
    name: 'Pull Day',
    exercises: [
      { name: 'Deadlift', sets: s(5, 4) },
      { name: 'Pull-ups', sets: s(8) },
      { name: 'Barbell row', sets: s(10) },
      { name: 'Face pulls', sets: s(15) },
      { name: 'Barbell curl', sets: s(12) },
    ],
  },
  {
    key: 'legs',
    name: 'Leg Day',
    exercises: [
      { name: 'Squat', sets: s(8, 4) },
      { name: 'Romanian deadlift', sets: s(10) },
      { name: 'Leg press', sets: s(12) },
      { name: 'Leg curl', sets: s(12) },
      { name: 'Standing calf raise', sets: s(15) },
    ],
  },
  {
    key: 'fullbody',
    name: 'Full Body',
    exercises: [
      { name: 'Squat', sets: s(8) },
      { name: 'Bench press', sets: s(8) },
      { name: 'Barbell row', sets: s(10) },
      { name: 'Overhead press', sets: s(10) },
      { name: 'Plank', sets: s(1) },
    ],
  },
  {
    key: 'upper',
    name: 'Upper Body',
    exercises: [
      { name: 'Bench press', sets: s(8) },
      { name: 'Barbell row', sets: s(10) },
      { name: 'Overhead press', sets: s(10) },
      { name: 'Lat pulldown', sets: s(12) },
      { name: 'Biceps curl', sets: s(12) },
    ],
  },
  {
    key: 'core',
    name: 'Core & Abs',
    exercises: [
      { name: 'Plank', sets: s(1) },
      { name: 'Hanging leg raise', sets: s(12) },
      { name: 'Cable crunch', sets: s(15) },
      { name: 'Russian twist', sets: s(20) },
    ],
  },
];

// Common exercise names for autocomplete.
export const EXERCISE_NAMES: string[] = [
  'Bench press', 'Incline bench press', 'Dumbbell press', 'Incline dumbbell press',
  'Overhead press', 'Arnold press', 'Lateral raises', 'Front raises',
  'Triceps pushdown', 'Skull crushers', 'Dips', 'Close-grip bench press',
  'Deadlift', 'Romanian deadlift', 'Barbell row', 'Dumbbell row', 'Pull-ups',
  'Lat pulldown', 'Face pulls', 'Barbell curl', 'Dumbbell curl', 'Hammer curl',
  'Squat', 'Front squat', 'Leg press', 'Lunges', 'Leg curl', 'Leg extension',
  'Standing calf raise', 'Hip thrust', 'Plank', 'Hanging leg raise',
  'Cable crunch', 'Russian twist', 'Running', 'Cycling', 'Rowing machine',
];
