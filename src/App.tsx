import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
import Home from './pages/Home'
import AdminPage from './pages/AdminPage'
import DonationsPage from './pages/DonationsPage'
import DonationDetailsPage from './pages/DonationDetailsPage'
import MoneyFlowPage from './pages/MoneyFlowPage'
import CharityCirclePage from './pages/CharityCirclePage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/donations" element={<DonationsPage />} />
        <Route path="/donations/:id" element={<DonationDetailsPage />} />
        <Route path="/money-flow" element={<MoneyFlowPage />} />
        <Route path="/charity-circle" element={<CharityCirclePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin-secret-dashboard" element={<AdminPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  )
}
