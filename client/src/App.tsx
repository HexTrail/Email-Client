import {Routes, Route} from 'react-router-dom'
import Signin from '../pages/Signin.tsx'
function App() {

  return (
    <>
      <Routes>
        <Route path='/' element={<Signin/>}/>
      </Routes>
    </>
  )
}

export default App
