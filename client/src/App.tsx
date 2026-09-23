import {Routes, Route} from 'react-router-dom'
import Signin from './pages/Signin.tsx'
import Home from './pages/Home.tsx'
function App() {

  return (
    <>
      <Routes>
        <Route path='/' element={<Signin/>}/>
        <Route path='/home' element={<Home/>}/>
      </Routes>
    </>
  )
}

export default App
