import test from 'node:test';
import assert from 'node:assert/strict';
import {startTour,advanceTour,describeTour,tourContext,tourFilter,TOUR_DAY,tourInteractionTargets,type TourState,type TourEvent} from '../lib/onboarding';
const send=(state:TourState,event:TourEvent)=>advanceTour(state,event)!;
const advanceToAlbum=()=>['next','next','next'].reduce(s=>send(s,{type:'next'}),startTour('album'));
test('album opening waits for the actual album, then browsing has no page quota or automatic advance',()=>{
  const invitation=startTour(null,true);assert.equal(send(invitation,{type:'next'}),invitation);
  let state=advanceToAlbum();assert.equal(state.step,'open-album');assert.equal(send(state,{type:'next'}),state);assert.equal(send(state,{type:'album-opened',id:'other'}),state);
  state=send(state,{type:'album-opened',id:'album'});assert.equal(state.step,'browse');assert.equal(send(state,{type:'next'}).step,'view-mode');
  for(const pages of [[],['a:left'],['a:left'],['a:right','b:left'],Array.from({length:50},(_,i)=>String(i))]){state=send(state,{type:'read',pages,book:false});assert.equal(state.step,'browse');}
  assert.equal(send(state,{type:'edit'}),state);state=send(state,{type:'next'});assert.equal(state.step,'view-mode');assert.equal(send(state,{type:'next'}),state);
  state=send(state,{type:'read',pages:['b:left','b:right'],book:true});assert.equal(state.step,'wide');
});
test('the full guide follows actual editor back buttons, calendar day and private creation actions',()=>{
  let state=send(advanceToAlbum(),{type:'album-opened',id:'album'});state=send(state,{type:'read',pages:['1'],book:true});assert.equal(state.step,'browse');state=send(state,{type:'next'});assert.equal(state.step,'wide');state=send(state,{type:'next'});assert.equal(state.step,'edit');assert.equal(send(state,{type:'next'}),state);
  state=send(state,{type:'edit'});assert.equal(state.step,'tools');assert.equal(tourContext(state.step),'editor');state=send(state,{type:'next'});assert.equal(state.step,'editor-back');state=send(state,{type:'editor-back'});assert.equal(state.step,'library-back');state=send(state,{type:'library-back'});assert.equal(state.step,'days');state=send(state,{type:'days'});assert.equal(state.step,'calendar');state=send(state,{type:'next'});assert.equal(state.step,'open-day');
  assert.equal(send(state,{type:'day-opened',day:'2026-10-09'}),state);state=send(state,{type:'day-opened',day:TOUR_DAY});assert.equal(state.step,'upload');state=send(state,{type:'next'});assert.equal(state.step,'close-day');state=send(state,{type:'day-closed'});assert.equal(state.step,'private');assert.equal(send(state,{type:'filter',value:'shared'}),state);state=send(state,{type:'filter',value:'personal'});assert.equal(state.step,'new-album');state=send(state,{type:'new-album'});assert.equal(state.step,'create');assert.equal(advanceTour(state,{type:'next'}),null);assert.equal(advanceTour(state,{type:'created'}),null);
});
test('every action has a real target and no bypass button; no album or empty library can force a write',()=>{
  const steps=['open-album','view-mode','edit','editor-back','library-back','days','open-day','close-day','private','new-album'] as const;
  for(const step of steps){const state={...startTour('a'),step},copy=describeTour(state);assert.ok(copy.target);assert.equal(copy.next,undefined);assert.equal(send(state,{type:'next'}),state);}
  const empty=['next','next','next'].reduce(s=>send(s,{type:'next'}),startTour(null));assert.equal(empty.step,'private');assert.equal(tourContext(empty.step),'library');assert.equal(tourFilter('create'),'personal');assert.equal(tourContext('invite'),null);
});
test('closing a new-album form returns to its launcher; unrelated events never skip required work',()=>{
  const state={...startTour('a'),step:'create' as const};assert.equal(send(state,{type:'create-closed'}).step,'new-album');assert.equal(advanceTour(null,{type:'created'}),null);
  const browsing={...state,step:'browse' as const};for(const event of [{type:'created'},{type:'days'},{type:'library-back'}] as TourEvent[])assert.equal(send(browsing,event),browsing);
});


test('calendar accepts the highlighted day directly, while unrelated days and navigation never advance it',()=>{
 const calendar={...startTour('album'),step:'calendar' as const};
 assert.equal(send(calendar,{type:'day-opened',day:TOUR_DAY}).step,'upload');
 assert.equal(send(calendar,{type:'day-opened',day:'2026-10-04'}),calendar);
 assert.equal(describeTour(calendar).next,undefined);
 assert.deepEqual(tourInteractionTargets(calendar),['[data-tour="day-2026-10-03"]']);
 assert.deepEqual(tourInteractionTargets({...calendar,step:'sections'}),[]);
 const tools=tourInteractionTargets({...calendar,step:'tools'});for(const region of ['.canvas-workspace','.inspector','.editor-toolbar'])assert.ok(tools.includes(region));assert.ok(!tools.includes('body'));
});
