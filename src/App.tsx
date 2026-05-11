import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
import Home from './pages/Home'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin-secret-dashboard" element={<AdminPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  )
}
