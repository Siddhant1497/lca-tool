import React from 'react';
import { useLCA } from './context/LCAContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/pages/Dashboard';
import ProjectSetup from './components/pages/ProjectSetup';
import MaterialInventory from './components/pages/MaterialInventory';
import LCAResults from './components/pages/LCAResults';
import ComplianceReport from './components/pages/ComplianceReport';
import ExportReport from './components/pages/ExportReport';

const PAGE_MAP = {
  dashboard:  Dashboard,
  project:    ProjectSetup,
  materials:  MaterialInventory,
  results:    LCAResults,
  compliance: ComplianceReport,
  export:     ExportReport,
} as const;

const AppInner: React.FC = () => {
  const { state } = useLCA();
  const Page = PAGE_MAP[state.activePage] ?? Dashboard;
  return (
    <div className="shell">
      <Header />
      <Sidebar />
      <main className="main">
        <Page />
      </main>
    </div>
  );
};

const App: React.FC = () => <AppInner />;
export default App;
