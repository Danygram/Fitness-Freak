export interface User {
  id: number;
  email: string;
  name: string;
  onboarded: boolean;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  exercises: Exercise[];
}

export interface SetEntry {
  reps: number;
  weight: number;
}

export interface Exercise {
  name: string;
  sets: SetEntry[];
}

export interface Workout {
  id: number;
  date: string;
  name: string;
  notes: string | null;
  exercises: Exercise[];
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

export interface Meal {
  id: number;
  date: string;
  name: string;
  meal_type: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Activity {
  id?: number;
  date: string;
  steps: number;
  distance_km: number;
  active_minutes: number;
}

export interface IntegrationStatus {
  provider: string;
  configured: boolean;
  connected: boolean;
  scope: string | null;
  last_synced: string | null;
}

export interface Device {
  id: number;
  name: string;
  type: string;
  battery: number;
  connected: number; // 0 | 1
  last_synced: string | null;
}

export type SessionType = 'walk' | 'run' | 'ride' | 'hike';

export interface Session {
  id: number;
  type: SessionType;
  title: string | null;
  date: string;
  duration_sec: number;
  distance_km: number;
  notes: string | null;
}

export type GoalType = 'weight' | 'calories' | 'steps' | 'workouts' | 'custom';

export interface Goal {
  id: number;
  type: GoalType;
  title: string;
  target: number;
  current: number;
  unit: string;
}

export interface DaySummary {
  date: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    count: number;
  };
  activity: { steps: number; distance_km: number; active_minutes: number };
  workouts: number;
  streak: number;
  bestStreak: number;
}

export interface FoodSearchResult {
  name: string;
  brand: string;
  serving: string;
  calories: number; // per 100 g
  protein: number;
  carbs: number;
  fat: number;
}

export interface CalendarDay {
  date: string;
  meals: number;
}

export interface TrendPoint {
  date: string;
  calories: number;
  steps: number;
  active_minutes: number;
  workouts: number;
}

export interface Settings {
  user_id: number;
  calorie_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  water_target_ml: number;
  step_target: number;
  start_weight: number | null;
  goal_weight: number | null;
}

export interface WeightLog {
  id: number;
  date: string;
  weight: number;
}

export interface Food {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DayLog {
  date: string;
  water_ml: number;
  habits: string[];
}

export interface WeekReport {
  start: string;
  end: string;
  daysLogged: number;
  avg: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water_ml: number;
    steps: number;
    active_minutes: number;
  };
  totals: { calories: number; protein: number; carbs: number; fat: number };
  workouts: number;
  activeDays: number;
  weightChange: number | null;
}
