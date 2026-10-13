const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/index.html','utf8');
for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const Game=vm.runInNewContext(html.match(/<script id="gameEngine">([\s\S]*?)<\/script>/)[1]+'\nGame;');
const seeded=seed=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const numbers=a=>a.map(c=>c.n),plain=a=>JSON.parse(JSON.stringify(a));
const card=(n,factor,revealed=false)=>({id:n,n,column:Math.floor(n/10),factor,revealed,misses:[]});
const position={config:{min:1,max:39,compactColumns:false},players:[{table:[]},{table:[card(2,2),card(6,2),card(8,2)]}]};
assert.deepEqual(plain(Game.candidates(position,0,position.players[1].table[0])),[2,4]);
assert.deepEqual(plain(Game.candidates(position,0,position.players[1].table[1])),[4,6]);
assert.deepEqual(plain(Game.candidates(position,0,position.players[1].table[2])),[6,8]);
position.players[1].table[1].revealed=true;
assert.deepEqual(plain(Game.candidates(position,0,position.players[1].table[2])),[8]);
const boundaries={config:{min:1,max:39,compactColumns:false},players:[{table:[]},{table:[card(12,2),card(14,2,true),card(18,2)]}]};
assert.deepEqual(plain(Game.candidates(boundaries,0,boundaries.players[1].table[0])),[10,12]);
assert.deepEqual(plain(Game.candidates(boundaries,0,boundaries.players[1].table[2])),[16,18]);
const legacy=Game.create({},seeded(50));
// A saved four-card opening must retain its cards when loaded after the rule change.
for(const p of legacy.players)legacy.deck.push(p.table.pop());
legacy.version=1;const originalDeck=numbers(legacy.deck);legacy.players[0].reserve=legacy.deck.slice(0,10);legacy.players[1].reserve=legacy.deck.slice(10);delete legacy.deck;
legacy.players.forEach(p=>p.table.reverse());
const migrated=Game.migrate(legacy,seeded(42));
assert.equal(migrated.version,3);assert.equal(migrated.deck.length,31);assert(!('reserve' in migrated.players[0]));
assert(migrated.players.every(p=>p.table.length===4));
assert.deepEqual(numbers(migrated.deck).sort((a,b)=>a-b),originalDeck.sort((a,b)=>a-b));
const exhausted=Game.create({},seeded(15));exhausted.deck=exhausted.deck.slice(0,1);
for(const expected of [1,0]){const actor=exhausted.turn,c=exhausted.players[1-actor].table.find(c=>!c.revealed);assert.equal(Game.guess(exhausted,actor,c.id,c.n===39?38:c.n+1).added,expected);assert.equal(exhausted.deck.length,0);}
const old2=Game.create({},seeded(51));old2.version=2;
for(const c of [...old2.deck,...old2.players.flatMap(p=>p.table)])c.factor=c.n===33?3:1;
const fixed=Game.migrate(old2,seeded(52)),fixedCards=[...fixed.deck,...fixed.players.flatMap(p=>p.table)];
for(const n of [11,13,17,19,22,23,26,29,31,33,34,37,38,39])assert.equal(fixedCards.find(c=>c.n===n).factor,'X');
const eighteen=fixedCards.find(c=>c.n===18);assert([2,3,6,9].includes(eighteen.factor));
const xPosition={config:{min:1,max:39,compactColumns:false},players:[{table:[card(13,'X')]},{table:[card(11,'X'),card(17,'X')]}]};
assert.deepEqual(plain(Game.candidates(xPosition,0,xPosition.players[1].table[0])),[11,17]);
assert.deepEqual(plain(Game.candidates(xPosition,0,xPosition.players[1].table[1])),[17,19]);
xPosition.players[1].table[1].revealed=true;
assert.deepEqual(plain(Game.candidates(xPosition,0,xPosition.players[1].table[0])),[11]);
const zero={config:{min:0,max:39,compactColumns:false},players:[{table:[]},{table:[card(0,'X')]}]};assert.deepEqual(plain(Game.candidates(zero,0,zero.players[1].table[0])),[0]);
let games=0,moves=0;
for(const {min,max}of [{min:0,max:39},{min:1,max:39},{min:1,max:49}])for(const initialCards of [4,5,6])for(const factorMode of ['random','all'])for(let seed=1;seed<=100;seed++){
 const rng=seeded(seed),s=Game.create({min,max,initialCards,factorMode},rng);
 const allCards=()=>[...s.deck,...s.players.flatMap(p=>p.table)];
 assert.equal(s.deck.length,max-min+1-initialCards*2);assert.equal(s.players[0].table.length,initialCards);assert.equal(s.players[1].table.length,initialCards);
 for(const c of allCards()){
  const legal=[];for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)if(a*b===c.n)legal.push(a);
  if(!legal.length)assert.equal(c.factor,'X');else assert(legal.includes(c.factor));
 }
 assert.throws(()=>Game.guess(s,1,s.players[0].table[0].id,1));assert.throws(()=>Game.guess(s,0,s.players[1].table[0].id,max+1));
 while(s.winner===null&&s.moves<500){
  const actor=s.turn,defender=s.players[1-actor],unknown=defender.table.filter(c=>!c.revealed),c=unknown[Math.floor(rng()*unknown.length)],values=Game.candidates(s,actor,c);
  assert(values.includes(c.n),'Visible position constraints must preserve the true answer');
  const before=defender.table.length,deckSize=s.deck.length,value=values[Math.floor(rng()*values.length)],e=Game.guess(s,actor,c.id,value);
  assert.equal(s.deck.length,deckSize-(e.correct?0:Math.min(2,deckSize)));assert.equal(defender.table.length,before+(e.correct?0:Math.min(2,deckSize)));
  if(e.correct)assert(c.revealed);else assert(c.misses.includes(value));
  for(const p of s.players)assert.deepEqual(plain(numbers(p.table)),plain([...numbers(p.table)].sort((a,b)=>a-b)));
  assert.equal(allCards().length,max-min+1);assert.equal(new Set(allCards().map(c=>c.n)).size,max-min+1);
  if(s.winner===null)assert.equal(s.turn,1-actor);
  if(s.turn===1&&s.winner===null){
   const ai=Game.aiMove(s,rng),target=s.players[0].table.find(c=>c.id===ai.id);assert(Game.candidates(s,1,target).includes(ai.value));
   const clone=plain(s);for(const hidden of clone.players[0].table)if(!hidden.revealed)hidden.n=999;clone.deck.forEach(c=>c.n=999);clone.players[0].table.forEach(c=>c.column+=100);
   assert.deepEqual(plain(Game.aiMove(s,()=>.4)),plain(Game.aiMove(clone,()=>.4)),'AI must use visible order and clues, not hidden numbers or deck contents');
  }
 }
 assert.notEqual(s.winner,null);assert(s.players[1-s.winner].table.every(c=>c.revealed));assert.throws(()=>Game.guess(s,s.turn,s.players[1-s.turn].table[0].id,1));games++;moves+=s.moves;
}
console.log('PASS: '+games+' seeded games, '+moves+' moves; shared deck conservation, sorted insertion, visible position and X deductions, valid 1-to-9 products, exhaustion, legacy migration and AI hidden-card independence.');

const distribution={baseline:{high:0,two:0,eligible:0},adjusted:{high:0,two:0,eligible:0}};
for(let seed=1;seed<=5000;seed++)for(const kind of ['baseline','adjusted']){
 const config=kind==='baseline'?{highRangeWeight:1,factorTwoWeight:1,xCardWeight:1}:{xCardWeight:1};
 const game=Game.create({...config,openingFiveToNineWeight:1,openingXWeight:1},seeded(seed));const opened=game.players.flatMap(p=>p.table),all=[...opened,...game.deck];
 distribution[kind].high+=opened.filter(c=>c.n>=30).length;
 for(const c of all){const factors=[];for(let f=2;f<=9;f++)if(c.n%f===0&&c.n/f>=1&&c.n/f<=9)factors.push(f);
  if(factors.includes(2)&&factors.length>1){distribution[kind].eligible++;if(c.factor===2)distribution[kind].two++;}
  if(c.n===2)assert.equal(c.factor,2,'A sole legal factor must remain available');
 }
}
assert(distribution.adjusted.high<distribution.baseline.high);assert(distribution.adjusted.high>distribution.baseline.high*.8,'High cards should only be mildly reduced');
assert(distribution.adjusted.two<distribution.baseline.two);assert(distribution.adjusted.two>distribution.baseline.two*.8,'Factor 2 should only be mildly reduced');
for(const [kind,c]of Object.entries(distribution))console.log(kind+': opening 30-39 '+(100*c.high/50000).toFixed(2)+'%; factor 2 among eligible multi-factor cards '+(100*c.two/c.eligible).toFixed(2)+'%');
console.log('PASS: 5000 paired seeded distributions; mild reductions with all cards and sole factor clues preserved.');

const xDistribution={baseline:0,adjusted:0};
for(let seed=1;seed<=5000;seed++)for(const kind of ['baseline','adjusted']){
 const game=Game.create({xCardWeight:kind==='baseline'?1:0.85,openingFiveToNineWeight:1,openingXWeight:1},seeded(seed));
 const opened=game.players.flatMap(p=>p.table),all=[...opened,...game.deck];
 xDistribution[kind]+=opened.filter(c=>c.factor==='X').length;
 assert.equal(all.filter(c=>c.factor==='X').length,14,'Weighting must preserve every X card in the full deck');
 assert.equal(new Set(all.map(c=>c.n)).size,39);
}
assert(xDistribution.adjusted<xDistribution.baseline);
assert(xDistribution.adjusted>xDistribution.baseline*.8,'X cards should only be mildly reduced');
for(const [kind,count]of Object.entries(xDistribution))console.log(kind+': opening X '+(100*count/50000).toFixed(2)+'%');
console.log('PASS: 5000 paired seeded X distributions; mild reduction with all 39 cards preserved.');

// Compare the new opening-only bias against the previous defaults, for each player.
const openingDistribution={baseline:[{low:0,lowColumn:0,x:0},{low:0,lowColumn:0,x:0}],adjusted:[{low:0,lowColumn:0,x:0},{low:0,lowColumn:0,x:0}]};
for(let seed=1;seed<=5000;seed++){
 const baseline=Game.create({openingFiveToNineWeight:1,openingXWeight:1},seeded(seed));
 const adjusted=Game.create({},seeded(seed));
 const before=[...baseline.deck,...baseline.players.flatMap(p=>p.table)].sort((a,b)=>a.n-b.n);
 const after=[...adjusted.deck,...adjusted.players.flatMap(p=>p.table)].sort((a,b)=>a.n-b.n);
 assert.deepEqual(plain(after),plain(before),'Opening weights must preserve all numbers and their assigned clues');
 assert.equal(adjusted.deck.length,29);
 for(const [kind,game]of [['baseline',baseline],['adjusted',adjusted]])game.players.forEach((p,i)=>{
  assert.equal(p.table.length,5);
  const totals=openingDistribution[kind][i];
  totals.low+=p.table.filter(c=>c.n>=5&&c.n<=9).length;
  totals.lowColumn+=p.table.filter(c=>c.column===0).length;
  totals.x+=p.table.filter(c=>c.factor==='X').length;
 });
}
for(let i=0;i<2;i++){
 const before=openingDistribution.baseline[i],after=openingDistribution.adjusted[i];
 for(const metric of ['low','x']){
  assert(after[metric]<before[metric],'Both players must receive fewer opening '+metric+' cards');
  assert(after[metric]>before[metric]*.8,'Opening '+metric+' reduction must remain mild');
 }
 assert(after.low/after.lowColumn<before.low/before.lowColumn,'The 0-9 column must favor 1-4 slightly more');
 for(const [kind,totals]of [['baseline',before],['adjusted',after]])console.log(kind+': player '+(i+1)+' opening 5-9 '+(100*totals.low/25000).toFixed(2)+'%; X '+(100*totals.x/25000).toFixed(2)+'%');
}
const savedOpening=Game.create({},seeded(777));delete savedOpening.config.openingFiveToNineWeight;delete savedOpening.config.openingXWeight;
const savedCopy=plain(savedOpening);assert.deepEqual(plain(Game.migrate(savedOpening)),savedCopy,'Existing games must not be redealt');
console.log('PASS: 5000 paired opening distributions; mild 5-9 and X reductions for both players, unchanged clues and saved games.');

for(const initialCards of [3,7,4.5,NaN])assert.throws(()=>Game.create({initialCards}));
const oldCount=Game.create({},seeded(12));delete oldCount.config.initialCards;
const oldCountCopy=plain(oldCount);assert.deepEqual(plain(Game.migrate(oldCount)),oldCountCopy,'Old five-card games must resume unchanged');
const fortyLane={config:{min:1,max:49,compactColumns:false},players:[{table:[]},{table:[card(40,5),card(42,6),card(49,7)]}]};
assert.deepEqual(plain(Game.candidates(fortyLane,0,fortyLane.players[1].table[0])),[40,45]);
assert.deepEqual(plain(Game.candidates(fortyLane,0,fortyLane.players[1].table[1])),[42,48]);
assert.deepEqual(plain(Game.candidates(fortyLane,0,fortyLane.players[1].table[2])),[49]);
const outsideForty={config:{min:1,max:49,compactColumns:false},players:[{table:[]},{table:[card(41,'X'),card(47,'X')]}]};
assert.deepEqual(plain(Game.candidates(outsideForty,0,outsideForty.players[1].table[0])),[41,43,44,46]);
assert.deepEqual(plain(Game.candidates(outsideForty,0,outsideForty.players[1].table[1])),[43,44,46,47]);
console.log('PASS: 4-6 opening cards, 1-49 clues and deductions, invalid count rejection and unchanged legacy hands.');

// Exhaustive small-puzzle oracle: assign numbers from clues, without reading hidden ranges.
function exhaustiveSupports(s,viewer){
 const table=s.players[1-viewer].table,known=new Set(s.players[viewer].table.map(c=>c.n));
 for(const p of s.players)for(const c of p.table)if(c.revealed)known.add(c.n);
 const products=new Set();for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)products.add(a*b);
 const domains=table.map(c=>{
  if(c.revealed)return [c.n];
  const values=[];for(let n=s.config.min;n<=s.config.max;n++)if(!known.has(n)&&!c.misses.includes(n)&&(c.factor==='X'?!products.has(n):products.has(n)&&n%c.factor===0&&n/c.factor<=9))values.push(n);
  return values;
 });
 const supports=table.map(()=>new Set()),chosen=[];
 function visit(i){
  if(i===table.length){chosen.forEach((n,j)=>supports[j].add(n));return;}
  for(const n of domains[i]){
   if(i){const previous=chosen[i-1],same=table[i].column===table[i-1].column;
    if(n<=previous||(same?Math.floor(n/10)!==Math.floor(previous/10):Math.floor(n/10)<=Math.floor(previous/10)))continue;
   }
   chosen[i]=n;visit(i+1);
  }
 }
 visit(0);return supports.map(values=>[...values].sort((a,b)=>a-b));
}
const ambiguous={config:{min:1,max:39,compactColumns:true},players:[{table:[]},{table:[card(2,2),card(6,2),card(8,2)]}]};
assert.deepEqual(plain(Game.candidates(ambiguous,0,ambiguous.players[1].table[0])),[2,4,10,12,14]);
ambiguous.players[1].table[1].revealed=true;
assert.deepEqual(plain(Game.candidates(ambiguous,0,ambiguous.players[1].table[0])),[2,4]);
let oraclePuzzles=0;
for(const max of [39,49])for(let seed=1;seed<=30;seed++){
 const s=Game.create({max,initialCards:4},seeded(seed));s.players[1].table=s.players[1].table.slice(0,3);
 if(seed%3===0)s.players[1].table[1].revealed=true;
 for(const c of s.players[1].table)if(!c.revealed)c.misses=[c.n===s.config.max?s.config.min:c.n+1];
 const expected=exhaustiveSupports(s,0);
 s.players[1].table.forEach((c,i)=>assert.deepEqual(plain(Game.candidates(s,0,c)),expected[i],'Compressed-group deductions must match exhaustive visible assignments'));
 const hidden=plain(s);hidden.players[1].table.forEach(c=>{if(!c.revealed)c.n=999;c.column+=100;});
 hidden.players[1].table.forEach((c,i)=>assert.deepEqual(plain(Game.candidates(hidden,0,c)),expected[i],'True range IDs must not affect deductions'));
 oraclePuzzles++;
}
const shifted=Game.create({initialCards:4},seeded(90));
shifted.players[0].table=[card(30,5)];shifted.players[1].table=[card(2,2),card(24,3)];shifted.deck=[card(12,2),card(25,5)];
const marked=shifted.players[1].table[1];Game.guess(shifted,0,marked.id,27);
assert.deepEqual(plain(Game.groups(shifted.players[1].table).map(group=>numbers(group))),[[2],[12],[24,25]]);
assert.deepEqual(plain(marked.misses),[27]);assert.equal(marked.lastMiss,27);
console.log('PASS: '+oraclePuzzles+' exhaustive compressed-group puzzles, hidden-range independence, revealed anchors and marked-card insertion.');
