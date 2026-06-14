import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';

const Home = lazy(() => import('./pages/Home.js').then(m => ({ default: m.Home })));
const Auth = lazy(() => import('./pages/Auth.js').then(m => ({ default: m.Auth })));
const ResetPassword = lazy(() => import('./pages/ResetPassword.js').then(m => ({ default: m.ResetPassword })));
const MovieDetails = lazy(() => import('./pages/MovieDetails.js').then(m => ({ default: m.MovieDetails })));
const SeatBooking = lazy(() => import('./pages/SeatBooking.js').then(m => ({ default: m.SeatBooking })));
const Dashboard = lazy(() => import('./pages/Dashboard.js').then(m => ({ default: m.Dashboard })));
const AdminPanel = lazy(() => import('./pages/AdminPanel.js').then(m => ({ default: m.AdminPanel })));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation.js').then(m => ({ default: m.BookingConfirmation })));
const MovieNights = lazy(() => import('./pages/MovieNights.js').then(m => ({ default: m.MovieNights })));
const CreateMovieNight = lazy(() => import('./pages/CreateMovieNight.js').then(m => ({ default: m.CreateMovieNight })));
const MovieNightDetail = lazy(() => import('./pages/MovieNightDetail.js').then(m => ({ default: m.MovieNightDetail })));
const MovieNightSuccess = lazy(() => import('./pages/MovieNightSuccess.js').then(m => ({ default: m.MovieNightSuccess })));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
    <div className="w-10 h-10 rounded-full border-t-2 animate-spin" style={{ borderColor: '#C9A84C' }} />
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col justify-between select-none" style={{ background: "#080808" }}>
          <div>
            <Navbar />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/movies/:id" element={<MovieDetails />} />
                <Route path="/shows/:showId/booking" element={<SeatBooking />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/booking/confirm/:code" element={<BookingConfirmation />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/movie-nights" element={<MovieNights />} />
                <Route path="/movie-nights/create" element={<CreateMovieNight />} />
                <Route path="/movie-nights/:id" element={<MovieNightDetail />} />
                <Route path="/movie-nights/:id/booked" element={<MovieNightSuccess />} />
              </Routes>
            </Suspense>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
