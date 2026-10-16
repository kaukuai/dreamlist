export type IslandItem={id:string;kind:string;slot:number;cost:number};
export type IslandState={balance:number;earned:number;level:number;name:string;items:IslandItem[];steps:number;dreamsFulfilled:number};
export const buildings=[
 {id:'blossom',name:'櫻花樹',subtitle:'把春天留在島上',cost:50,level:1,sprite:0},
 {id:'library',name:'森光書屋',subtitle:'收藏未來的每個可能',cost:125,level:2,sprite:1},
 {id:'windmill',name:'微風磨坊',subtitle:'讓日常慢慢轉動',cost:175,level:2,sprite:2},
 {id:'crystal',name:'星露花園',subtitle:'每一份努力，都會發光',cost:75,level:1,sprite:3},
 {id:'greenhouse',name:'暖陽溫室',subtitle:'培育你喜歡的生活',cost:200,level:3,sprite:4},
 {id:'observatory',name:'月光觀星台',subtitle:'向更遠的夢想眺望',cost:300,level:4,sprite:5}
];
export const islandStages=['初生之嶼','繁芽之嶼','森光之嶼','星辰之嶼','夢境之嶼'];
export const islandLevel=(earned:number)=>Math.min(5,Math.floor(earned/150)+1);
export const lots=[{x:34,y:31},{x:60,y:28},{x:54,y:39},{x:20,y:43},{x:68,y:52},{x:83,y:43}];

