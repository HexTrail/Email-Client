import { Link, Route, Routes } from 'react-router-dom'
import Signin from './pages/Signin.tsx'
import Home from './pages/Home.tsx'
import Verify from './pages/Verify.tsx'
import ForgotPassword from './pages/ForgotPassword.tsx'
import { useAuth } from './Context/AuthContext.tsx'
import PhonemailLogo from './components/PhonemailLogo.tsx'
import './pages/AuthPages.css'

function ProtectedHome() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main className="auth-screen">
        <div className="auth-panel auth-notice" role="status" aria-live="polite">
          <PhonemailLogo />
          <p>Checking your session...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="auth-screen">
        <div className="auth-panel auth-notice">
          <PhonemailLogo />
          <p className="auth-eyebrow">INBOX ACCESS</p>
          <h1>Sign in to continue</h1>
          <p className="auth-description">You need to sign in before you can open your inbox.</p>
          <Link className="auth-submit" to="/">Go to sign in</Link>
        </div>
      </main>
    )
  }

  return <Home />
}

function App() {

  return (
    <>
      <Routes>
        <Route path='/' element={<Signin/>}/>
        <Route path='/home' element={<ProtectedHome/>}/>
        <Route path='/verify' element={<Verify/>}/>
        <Route path='/forgot-password' element={<ForgotPassword/>}/>
      </Routes>
    </>
  )
}

export default App
