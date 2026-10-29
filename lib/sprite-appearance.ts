import type {CharacterState} from './character-model.ts';
export type HeroAppearance=Pick<CharacterState,'level'|'equipped'|'avatarColor'>;
export const appearanceKey=(a?:HeroAppearance)=>a?[a.level%5,a.level>=10?3:a.level>=5?2:a.level>=2?1:0,a.avatarColor,...['weapon','head','offhand','outfit','boots','charm'].map(s=>a.equipped[s as keyof typeof a.equipped]??'-')].join(':'):'npc';
export const growthTrim=(a?:HeroAppearance)=>!a?0:a.level>=10?3:a.level>=5?2:a.level>=2?1:0;
