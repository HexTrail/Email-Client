import {Routes, Route} from 'react-router-dom'
import Signin from './pages/Signin.tsx'
import Home from './pages/Home.tsx'
import Verify from './pages/Verify.tsx'
function App() {

  return (
    <>
      <Routes>
        <Route path='/' element={<Signin/>}/>
        <Route path='/home' element={<Home/>}/>
        <Route path='/verify' element={<Verify/>}/>
      </Routes>
    </>
  )
}

export default App
