import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./lib/firebase";
import { ErrorBoundary } from "./components/ErrorBoundary";

import Login from "./pages/Login";
import Menu from "./pages/Menu";
import Friends from "./pages/Friends";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import Party from "./pages/Party";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-400">Yükleniyor...</div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] flex items-center justify-center bg-zinc-950 sm:p-4 text-zinc-50">
        <div className="w-full h-[100dvh] sm:h-[800px] sm:max-h-[90vh] max-w-md bg-zinc-900 flex flex-col sm:rounded-3xl sm:border border-white/10 shadow-2xl overflow-hidden relative">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={user ? <Navigate to="/menu" /> : <Login />} />
              <Route path="/menu" element={user ? <Menu /> : <Navigate to="/" />} />
              <Route path="/friends" element={user ? <Friends /> : <Navigate to="/" />} />
              <Route path="/leaderboard" element={user ? <Leaderboard /> : <Navigate to="/" />} />
              <Route path="/game/:gameId" element={user ? <Game /> : <Navigate to="/" />} />
              <Route path="/party/:id" element={user ? <Party /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </div>
    </BrowserRouter>
  );
}
