import { CreateEvent } from './pages/CreateEvent';
import { FindMyPhotos } from './pages/FindMyPhotos';
import { Home } from './pages/Home';
import { UploadPhotos } from './pages/UploadPhotos';
import { BrowserRouter, Route, Router, Routes, useNavigate } from 'react-router-dom';

import './App.css'
import Header from './components/Header';

function App() {


  return (
    <>
        <Header/>
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/createEvent' element= { <CreateEvent/> }/>
          <Route path='/uploadPhotos' element= { <UploadPhotos/> }/>
          <Route path='findMyPhotos' element= { <FindMyPhotos/> } />
        </Routes>
    </>
  )
}

export default App
