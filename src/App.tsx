import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { SitesPage } from "@/pages/SitesPage";
import { PurchasesPage } from "@/pages/PurchasesPage";
import { LedgerPage } from "@/pages/LedgerPage";
import { BoqPage } from "@/pages/BoqPage";
import { StockPage } from "@/pages/StockPage";
import { MastersPage } from "@/pages/MastersPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PrintGatePass } from "@/pages/print/PrintGatePass";
import { PrintReturnSlip } from "@/pages/print/PrintReturnSlip";
import { PrintBoqFsr } from "@/pages/print/PrintBoqFsr";
import { PrintPurchase } from "@/pages/print/PrintPurchase";

export function App() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        {/* Printable views (No AppShell) */}
        <Route path="/print/issue/:id" element={<PrintGatePass />} />
        <Route path="/print/return/:id" element={<PrintReturnSlip />} />
        <Route path="/print/boq/:id" element={<PrintBoqFsr />} />
        <Route path="/print/purchase/:id" element={<PrintPurchase />} />

        {/* Core application routes wrapped in AppShell */}
        <Route
          path="/"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/sites"
          element={
            <AppShell>
              <SitesPage />
            </AppShell>
          }
        />
        <Route
          path="/purchases"
          element={
            <AppShell>
              <PurchasesPage />
            </AppShell>
          }
        />
        <Route
          path="/ledger"
          element={
            <AppShell>
              <LedgerPage />
            </AppShell>
          }
        />
        <Route
          path="/boq"
          element={
            <AppShell>
              <BoqPage />
            </AppShell>
          }
        />
        <Route
          path="/stock"
          element={
            <AppShell>
              <StockPage />
            </AppShell>
          }
        />
        <Route
          path="/masters"
          element={
            <AppShell>
              <MastersPage />
            </AppShell>
          }
        />
        <Route
          path="/settings"
          element={
            <AppShell>
              <SettingsPage />
            </AppShell>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
