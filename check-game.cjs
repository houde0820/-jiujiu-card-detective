const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/index.html','utf8');
for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const Game=vm.runInNewContext(html.match(/<script id="gameEngine">([\s\S]*?)<\/script>/)[1]+'\nGame;');
const seeded=seed=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const numbers=a=>a.map(c=>c.n),plain=a=>JSON.parse(JSON.stringify(a));
const card=(n,factor,revealed=false)=>({id:n,n,column:Math.floor(n/10),factor,revealed,misses:[]});
const position={config:{min:1,max:39},players:[{table:[]},{table:[card(2,2),card(6,2),card(8,2)]}]};
assert.deepEqual(plain(Game.candidates(position,0,position.players[1].table[0])),[2,4]);
assert.deepEqual(plain(Game.candidates(position,0,position.players[1].table[1])),[4,6]);
assert.deepEqual(plain(Game.candidates(position,0,position.players[1].table[2])),[6,8]);
position.players[1].table[1].revealed=true;
assert.deepEqual(plain(Game.candidates(position,0,position.players[1].table[2])),[8]);
const boundaries={config:{min:1,max:39},players:[{table:[]},{table:[card(12,2),card(14,2,true),card(18,2)]}]};
assert.deepEqual(plain(Game.candidates(boundaries,0,boundaries.players[1].table[0])),[10,12]);
assert.deepEqual(plain(Game.candidates(boundaries,0,boundaries.players[1].table[2])),[16,18]);
const legacy=Game.create({},seeded(50));
legacy.version=1;const originalDeck=numbers(legacy.deck);legacy.players[0].reserve=legacy.deck.slice(0,10);legacy.players[1].reserve=legacy.deck.slice(10);delete legacy.deck;
legacy.players.forEach(p=>p.table.reverse());
const migrated=Game.migrate(legacy,seeded(42));
assert.equal(migrated.version,3);assert.equal(migrated.deck.length,31);assert(!('reserve' in migrated.players[0]));
assert.deepEqual(numbers(migrated.deck).sort((a,b)=>a-b),originalDeck.sort((a,b)=>a-b));
const exhausted=Game.create({},seeded(15));exhausted.deck=exhausted.deck.slice(0,1);
for(const expected of [1,0]){const actor=exhausted.turn,c=exhausted.players[1-actor].table.find(c=>!c.revealed);assert.equal(Game.guess(exhausted,actor,c.id,c.n===39?38:c.n+1).added,expected);assert.equal(exhausted.deck.length,0);}
const old2=Game.create({},seeded(51));old2.version=2;
for(const c of [...old2.deck,...old2.players.flatMap(p=>p.table)])c.factor=c.n===33?3:1;
const fixed=Game.migrate(old2,seeded(52)),fixedCards=[...fixed.deck,...fixed.players.flatMap(p=>p.table)];
for(const n of [11,13,17,19,22,23,26,29,31,33,34,37,38,39])assert.equal(fixedCards.find(c=>c.n===n).factor,'X');
const eighteen=fixedCards.find(c=>c.n===18);assert([2,3,6,9].includes(eighteen.factor));
const xPosition={config:{min:1,max:39},players:[{table:[card(13,'X')]},{table:[card(11,'X'),card(17,'X')]}]};
assert.deepEqual(plain(Game.candidates(xPosition,0,xPosition.players[1].table[0])),[11,17]);
assert.deepEqual(plain(Game.candidates(xPosition,0,xPosition.players[1].table[1])),[17,19]);
xPosition.players[1].table[1].revealed=true;
assert.deepEqual(plain(Game.candidates(xPosition,0,xPosition.players[1].table[0])),[11]);
const zero={config:{min:0,max:39},players:[{table:[]},{table:[card(0,'X')]}]};assert.deepEqual(plain(Game.candidates(zero,0,zero.players[1].table[0])),[0]);
let games=0,moves=0;
for(const min of [0,1])for(const factorMode of ['random','all'])for(let seed=1;seed<=100;seed++){
 const rng=seeded(seed),s=Game.create({min,factorMode},rng);
 const allCards=()=>[...s.deck,...s.players.flatMap(p=>p.table)];
 assert.equal(s.deck.length,32-min);assert.equal(s.players[0].table.length,4);assert.equal(s.players[1].table.length,4);
 for(const c of allCards()){
  const legal=[];for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)if(a*b===c.n)legal.push(a);
  if(!legal.length)assert.equal(c.factor,'X');else assert(legal.includes(c.factor));
 }
 assert.throws(()=>Game.guess(s,1,s.players[0].table[0].id,1));assert.throws(()=>Game.guess(s,0,s.players[1].table[0].id,40));
 while(s.winner===null&&s.moves<500){
  const actor=s.turn,defender=s.players[1-actor],unknown=defender.table.filter(c=>!c.revealed),c=unknown[Math.floor(rng()*unknown.length)],values=Game.candidates(s,actor,c);
  assert(values.includes(c.n),'Visible position constraints must preserve the true answer');
  const before=defender.table.length,deckSize=s.deck.length,value=values[Math.floor(rng()*values.length)],e=Game.guess(s,actor,c.id,value);
  assert.equal(s.deck.length,deckSize-(e.correct?0:Math.min(2,deckSize)));assert.equal(defender.table.length,before+(e.correct?0:Math.min(2,deckSize)));
  if(e.correct)assert(c.revealed);else assert(c.misses.includes(value));
  for(const p of s.players)assert.deepEqual(plain(numbers(p.table)),plain([...numbers(p.table)].sort((a,b)=>a-b)));
  assert.equal(allCards().length,40-min);assert.equal(new Set(allCards().map(c=>c.n)).size,40-min);
  if(s.winner===null)assert.equal(s.turn,1-actor);
  if(s.turn===1&&s.winner===null){
   const ai=Game.aiMove(s,rng),target=s.players[0].table.find(c=>c.id===ai.id);assert(Game.candidates(s,1,target).includes(ai.value));
   const clone=plain(s);for(const hidden of clone.players[0].table)if(!hidden.revealed)hidden.n=999;clone.deck.forEach(c=>c.n=999);
   assert.deepEqual(plain(Game.aiMove(s,()=>.4)),plain(Game.aiMove(clone,()=>.4)),'AI must use visible order and clues, not hidden numbers or deck contents');
  }
 }
 assert.notEqual(s.winner,null);assert(s.players[1-s.winner].table.every(c=>c.revealed));assert.throws(()=>Game.guess(s,s.turn,s.players[1-s.turn].table[0].id,1));games++;moves+=s.moves;
}
console.log('PASS: '+games+' seeded games, '+moves+' moves; shared deck conservation, sorted insertion, visible position and X deductions, valid 1-to-9 products, exhaustion, legacy migration and AI hidden-card independence.');
