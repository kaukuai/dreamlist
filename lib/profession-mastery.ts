import {professionOf,skillRank,type CharacterState,type ProfessionId} from './character-model.ts';
export const masteryNames:Record<ProfessionId,{name:string;effect:string}>={
 wanderer:{name:'旅人的應變',effect:'每階精修使戰技威力提高5%。'},
 warrior:{name:'破曉架勢',effect:'戰技命中後獲得短暫守護，最高0.5秒。'},
 mage:{name:'星頁延展',effect:'每階精修額外增加20射程。'},
 ranger:{name:'逐風快弦',effect:'每階精修使普攻間隔縮短0.04秒。'},
 bard:{name:'餘音安撫',effect:'每階精修使戰技額外恢復4生命。'},
 artisan:{name:'穩固符紋',effect:'每階精修讓戰技守護延長0.2秒。'},
 healer:{name:'月泉回流',effect:'每階精修使戰技多恢復6生命，調息多恢復4生命。'}
};
export function masteryStage(player:Pick<CharacterState,'level'|'skillXp'|'profession'|'advancements'>){
 const job=professionOf(player.profession),trained=player.level>=5&&job.training.every(id=>skillRank(player.skillXp[id])>=2);
 return trained?(player.advancements[player.profession]>=1?2:1):0;
}
