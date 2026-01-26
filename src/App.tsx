import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GlobalStylesProvider } from './styles/GlobalStylesProvider';
import { ImageGenerator } from './ImageGenerator';
import { VideoGenerator } from './VideoGenerator';
import { routes } from './routes';

function App() {
  return (
    <GlobalStylesProvider>
      <Router>
        <Routes>
          {routes.map(route => (
            <Route
              key={route.path}
              path={route.path}
              element={route.path === '/' ? <ImageGenerator /> : <VideoGenerator />}
            />
          ))}
        </Routes>
      </Router>
    </GlobalStylesProvider>
  );
}

export default App;

