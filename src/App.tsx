import React, { Suspense, lazy } from 'react';
import { useLCA } from './context/LCAContext';
import { useUi } from './context/UiContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HubSkeleton from './components/ui/Skeleton';
import Dashboard from './components/pages/Dashboard';
import ProjectSetup from './components/pages/ProjectSetup';
import MaterialInventory from './components/pages/MaterialInventory';
import LCAResults from './components/pages/LCAResults';
import ComplianceReport from './components/pages/ComplianceReport';
import ExportReport from './components/pages/ExportReport';

const CommandCenter = lazy(() => import('./components/pages/CommandCenter'));

const PAGE_MAP = {
  hub:        CommandCenter,
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
  return (
    <div className={`shell${collapsed ? ' collapsed' : ''}`}>
      <Header />
      <Sidebar />
      <main className="main" id="main">
        <Suspense fallback={<HubSkeleton />}>
          <Page />
        </Suspense>
      </main>
    </div>
  );
};

const App: React.FC = () => <AppInner />;
export default App;
