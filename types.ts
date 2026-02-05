
export interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface Dream {
  id: string;
  title: string;
  description: string;
  category: 'Career' | 'Travel' | 'Health' | 'Personal' | 'Finance' | 'Social';
  color: string;
  milestones: Milestone[];
  createdAt: number;
}

export type DreamCategory = Dream['category'];

export const CATEGORY_COLORS: Record<DreamCategory, string> = {
  Career: 'from-sky-300 to-blue-400',
  Travel: 'from-orange-300 to-amber-400',
  Health: 'from-pink-300 to-rose-400',
  Personal: 'from-lime-300 to-green-400',
  Finance: 'from-yellow-300 to-amber-400',
  Social: 'from-purple-300 to-indigo-400',
};
