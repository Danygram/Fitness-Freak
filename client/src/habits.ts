// Manual "clean day" habits the user can toggle on. Completing one lights it green.
export interface HabitDef {
  key: string;
  label: string;
  icon: string;
}

export const HABITS: HabitDef[] = [
  { key: 'no_sugar', label: 'No added sugar', icon: '🍬' },
  { key: 'no_junk', label: 'No junk food', icon: '🍟' },
  { key: 'home_cooked', label: 'Home-cooked only', icon: '🍳' },
  { key: 'no_soda', label: 'No sugary drinks', icon: '🥤' },
  { key: 'veggies', label: 'Ate my veggies', icon: '🥦' },
];
