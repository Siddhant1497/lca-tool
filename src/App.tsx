import React, { Suspense, lazy, useEffect } from 'react';
import { useLCA } from './context/LCAContext';
import { useUi } from './context/UiContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HubSkeleton from './components/ui/Skeleton';
import CommandPalette from './components/CommandPalette';
import Dashboard from './components/pages/Dashboard';
import ProjectSetup from './components/pages/ProjectSetup';
import MaterialInventory from './components/pages/MaterialInventory';
import LCAResults from './components/pages/LCAResults';
import ComplianceReport from './components/pages/ComplianceReport';
import ExportReport from './components/pages/ExportReport';

const CommandCenter = lazy(() => import('./components/pages/CommandCenter'));
const DataManager = lazy(() => import('./components/pages/DataManager'));
const Disclosures = lazy(() => import('./components/pages/Disclosures'));

const PAGE_MAP = {
  hub:        CommandCenter,
  data:       DataManager,
  reports:    Disclosures,
  dashboard:  Dashboard,
  project:    ProjectSetup,
  materials:  MaterialInventory,
  results:    LCAResults,
  compliance: ComplianceReport,
  export:     ExportReport,
} as const;

const AppInner: React.FC = () => {
  const { state } = useLCA();
  const { collapsed } = useUi();
  const Page = PAGE_MAP[state.activePage] ?? CommandCenter;
  // New page → start at the top (the scroll container is <main>, not the window).
  useEffect(() => { document.getElementById('main')?.scrollTo({ top: 0 }); }, [state.activePage]);
  return (
    <div className={`shell${collapsed ? ' collapsed' : ''}`}>
      <Header />
      <Sidebar />
      <main className="main" id="main">
        <Suspense fallback={<HubSkeleton />}>
          <Page />
        </Suspense>
      </main>
      <CommandPalette />
    </div>
  );
};

const App: React.FC = () => <AppInner />;
export default App;
