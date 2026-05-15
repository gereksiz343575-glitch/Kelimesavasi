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
    <div className="flex flex-col h-full bg-zinc-900 border-zinc-800">
      <div className="p-4 border-b border-zinc-800 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => navigate("/menu")} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">Arkadaşlar</h1>
      </div>

      <div className="p-6 space-y-6">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex space-x-2">
            <Input 
              placeholder="Oyuncu adı veya #ID ile ara..." 
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
            />
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className={`text-xs ${error.includes('gönderildi') ? 'text-emerald-400' : 'text-red-400'}`}>{error}</p>}
        </form>

        {searchResult && (
          <div className="p-4 bg-zinc-800 rounded-xl flex items-center justify-between border border-zinc-700">
            <span className="font-medium text-zinc-200">
              {searchResult.displayName}
              {searchResult.shortId && <span className="ml-2 text-[10px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full ring-1 ring-zinc-600">#{searchResult.shortId}</span>}
            </span>
            <Button size="sm" onClick={handleSendRequest}><UserPlus className="h-4 w-4 mr-2"/> İstek Gönder</Button>
          </div>
        )}

        {friendRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Gelen İstekler ({friendRequests.length})</h2>
            <div className="space-y-2">
              {friendRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-zinc-950/50 p-3 rounded-lg border border-emerald-900/50">
                  <span className="font-medium text-emerald-100">{req.displayName}</span>
                  <div className="flex space-x-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/20" onClick={() => handleAcceptRequest(req)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/20" onClick={() => handleRejectRequest(req.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Arkadaş Listen ({friends.length})</h2>
          {friends.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">Henüz hiç arkadaş eklemedin.</p>
          ) : (
            <div className="space-y-2">
              {friends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                  <span className="font-medium inline-flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                    {friend.displayName}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleInvite(friend.friendId, friend.displayName)}>
                    <Swords className="h-4 w-4 mr-2" />
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
