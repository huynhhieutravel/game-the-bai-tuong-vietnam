import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { GameProvider } from './contexts/GameProvider';
import { SelectionProvider } from './contexts/SelectionProvider';
import GameView from './components/game/GameView';

import WikiLayout from './components/wiki/WikiLayout';
import HeroList from './components/wiki/HeroList';
import HeroDetail from './components/wiki/HeroDetail';
import { CardList, TrickList, EquipList } from './components/wiki/CardLists';
import RulesView from './components/wiki/RulesView';
import AffinityList from './components/wiki/AffinityList';
import CardTypes from './components/wiki/CardTypes';
import BugHistory from './components/wiki/BugHistory';
import FixedHeroes from './components/wiki/FixedHeroes';
import FixedCards from './components/wiki/FixedCards';
import FixedSystems from './components/wiki/FixedSystems';
import Changelog from './components/wiki/Changelog';
import MainMenu from './components/MainMenu';
import './index.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/game" element={
        <GameProvider playerCount={4}>
          <SelectionProvider>
            <GameView />
          </SelectionProvider>
        </GameProvider>
      } />
      
      <Route path="/wiki" element={<WikiLayout />}>
        <Route index element={<MainMenu />} />
        <Route path="heroes" element={<HeroList />} />
        <Route path="heroes/:heroId" element={<HeroDetail />} />
        <Route path="cards" element={<CardList />} />
        <Route path="tricks" element={<TrickList />} />
        <Route path="equips" element={<EquipList />} />
        <Route path="rules" element={<RulesView />} />
        <Route path="affinity" element={<AffinityList />} />
        <Route path="card-types" element={<CardTypes />} />
        <Route path="bug-history" element={<BugHistory />} />
        <Route path="bugs" element={<BugHistory />} />
        <Route path="fixed-heroes" element={<FixedHeroes />} />
        <Route path="fixed-cards" element={<FixedCards />} />
        <Route path="fixed-systems" element={<FixedSystems />} />
        <Route path="changelog" element={<Changelog />} />
      </Route>
    </Routes>
  );
}
