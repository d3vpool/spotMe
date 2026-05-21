import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';

// Layout
import { PrivateRoute } from '@components/layout/PrivateRoute';

// Public Pages
import { Home } from '@pages/Home';
import { SignIn } from '@pages/SignIn';
import { SignUp } from '@pages/SignUp';
import { PublicEvent } from '@pages/PublicEvent';

// Private Pages
import { MyEvents } from '@pages/MyEvents';
import { CreateEvent } from '@pages/CreateEvent';
import { EventDetails } from '@pages/EventDetails';
import { FindMyPhotos } from '@pages/FindMyPhotos';
import { UploadPhotos } from '@pages/UploadPhotos';

import { getToken } from '@utils/auth';

function App() {
  const token = getToken();

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/home" element={<Home />} />

          {/* Public Auth Routes */}
          <Route path="/login" element={token ? <Navigate to="/events" replace /> : <SignIn />} />
          <Route path="/signup" element={token ? <Navigate to="/events" replace /> : <SignUp />} />

          {/* Public Event Route */}
          <Route path="/share/:shareToken" element={<PublicEvent />} />

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to={token ? "/events" : "/login"} replace />} />

          {/* Private Routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/events" element={<MyEvents />} />
            <Route path="/events/:eventId" element={<EventDetails />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/find-my-photos" element={<FindMyPhotos />} />
            <Route path="/upload-photos" element={<UploadPhotos />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
