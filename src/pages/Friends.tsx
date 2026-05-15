import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, addDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ArrowLeft, UserPlus, Search, Swords, Check, X, Clock } from "lucide-react";

export default function Friends() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Listen to friends
    const qFriends = query(collection(db, "users", auth.currentUser.uid, "friends"));
    const unsubFriends = onSnapshot(qFriends, (snapshot) => {
      const fr: any[] = [];
      snapshot.forEach(doc => {
        fr.push({ id: doc.id, ...doc.data() });
      });
      setFriends(fr);
    });

    // Listen to friend requests
    const qRequests = query(collection(db, "users", auth.currentUser.uid, "friendRequests"));
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      const req: any[] = [];
      snapshot.forEach(doc => {
        req.push({ id: doc.id, ...doc.data() });
      });
      setFriendRequests(req);
    });

    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchUsername.trim();
    if (!term) return;
    setLoading(true);
    setError("");
    setSearchResult(null);

    try {
      let snapshot;
      
      // Try searching by shortId first
      const idTerm = term.replace('#', '').toUpperCase();
      const idQ = query(
        collection(db, "users"),
        where("shortId", "==", idTerm)
      );
      snapshot = await getDocs(idQ);
      
      // If not found by ID, try exact username
      if (snapshot.empty) {
        const nameQ = query(
          collection(db, "users"),
          where("displayName", "==", term)
        );
        snapshot = await getDocs(nameQ);
      }
      
      if (snapshot.empty) {
        setError("Kullanıcı bulunamadı. Lütfen büyük/küçük harflere veya ID'ye dikkat edin.");
      } else {
        const foundUser = snapshot.docs[0];
        if (foundUser.id === auth.currentUser?.uid) {
          setError("Kendinizi ekleyemezsiniz.");
        } else if (friends.some(f => f.friendId === foundUser.id)) {
          setError("Bu kullanıcı zaten listenizde.");
        } else {
          setSearchResult({ id: foundUser.id, ...foundUser.data() });
        }
      }
    } catch (err: any) {
      setError("Arama sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult || !auth.currentUser) return;
    try {
      const requestRef = doc(db, "users", searchResult.id, "friendRequests", auth.currentUser.uid);
      await setDoc(requestRef, {
        requesterId: auth.currentUser.uid,
        displayName: auth.currentUser.displayName,
        createdAt: serverTimestamp()
      });
      setSearchResult(null);
      setSearchUsername("");
      setError("Arkadaşlık isteği gönderildi!");
      setTimeout(() => setError(""), 3000);
    } catch (err: any) {
      setError("İstek gönderilemedi.");
      console.error(err);
    }
  };

  const handleAcceptRequest = async (req: any) => {
    if (!auth.currentUser) return;
    try {
      // Add friend to me
      await setDoc(doc(db, "users", auth.currentUser.uid, "friends", req.requesterId), {
        friendId: req.requesterId,
        displayName: req.displayName,
        createdAt: serverTimestamp()
      });
      
      // Add me to friend
      await setDoc(doc(db, "users", req.requesterId, "friends", auth.currentUser.uid), {
        friendId: auth.currentUser.uid,
        displayName: auth.currentUser.displayName,
        createdAt: serverTimestamp()
      });

      // Remove request
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "friendRequests", req.requesterId));
    } catch(err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "friendRequests", reqId));
    } catch(err) {
      console.error(err);
    }
  };

  const handleInvite = async (friendId: string, friendName: string) => {
    if (!auth.currentUser) return;
    try {
      // Create interesting dummy game state
      // We will let the Game page pick the categories
      const gameRef = await addDoc(collection(db, "games"), {
        status: "invited",
        player1Id: auth.currentUser.uid,
        player1Name: auth.currentUser.displayName,
        player2Id: friendId,
        player2Name: friendName,
        turn: auth.currentUser.uid,
        category: "",
        letter: "",
        player1Words: [],
        player2Words: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate(`/game/${gameRef.id}`);
    } catch(err) {
      console.error("Game creation failed", err);
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-zinc-900/50">
      {/* Back Button */}
      <div className="absolute top-4 sm:top-5 left-4 sm:left-5 z-50 pointer-events-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/menu")} className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 backdrop-blur-md border border-white/10 transition-all shadow-lg rounded-full h-10 w-10">
             <ArrowLeft className="h-5 w-5" />
          </Button>
      </div>

      <div className="p-4 pt-16 sm:pt-16 border-b border-white/5 flex items-center justify-center bg-zinc-900/80">
        <h1 className="font-bold text-lg text-white">Arkadaşlar</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6" style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom))' }}>
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex space-x-3">
            <Input 
              placeholder="Oyuncu adı veya #ID ile ara..." 
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
              className="bg-zinc-900/50 border-white/5"
            />
            <Button type="submit" disabled={loading} className="w-11 px-0 shadow-md">
              <Search className="h-5 w-5" />
            </Button>
          </div>
          {error && <p className={`text-xs font-medium px-2 ${error.includes('gönderildi') ? 'text-emerald-400' : 'text-red-400'}`}>{error}</p>}
        </form>

        {searchResult && (
          <div className="p-4 bg-zinc-800/60 rounded-2xl flex items-center justify-between border border-white/10 shadow-lg">
            <span className="font-bold text-white flex items-center gap-2">
              {searchResult.displayName}
              {searchResult.shortId && <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-full ring-1 ring-white/5 font-medium">#{searchResult.shortId}</span>}
            </span>
            <Button size="sm" onClick={handleSendRequest} className="bg-blue-500 hover:bg-blue-400 text-white rounded-lg shadow-md"><UserPlus className="h-4 w-4 mr-2"/> İstek Gönder</Button>
          </div>
        )}

        {friendRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-black text-emerald-400 uppercase tracking-widest pl-1">Gelen İstekler ({friendRequests.length})</h2>
            <div className="space-y-2">
              {friendRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-zinc-900/80 p-3 rounded-2xl border border-emerald-500/20 shadow-sm">
                  <span className="font-bold text-emerald-100 pl-1">{req.displayName}</span>
                  <div className="flex space-x-2">
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg" onClick={() => handleAcceptRequest(req)}>
                      <Check className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg" onClick={() => handleRejectRequest(req.id)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest pl-1">Arkadaş Listen ({friends.length})</h2>
          {friends.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-2xl p-6 text-center border border-white/5">
                <p className="text-sm text-zinc-500 font-medium tracking-wide">Henüz arkadaş eklemedin.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between bg-zinc-900/80 p-3 rounded-2xl border border-white/5 shadow-sm">
                  <span className="font-bold inline-flex items-center text-zinc-200 pl-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-3 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    {friend.displayName}
                  </span>
                  <Button size="sm" variant="outline" className="rounded-xl border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300" onClick={() => handleInvite(friend.friendId, friend.displayName)}>
                    <Swords className="h-4 w-4 mr-2 text-blue-400" />
                    Davet Et
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
