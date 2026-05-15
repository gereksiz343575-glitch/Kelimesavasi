import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { Button } from "../components/ui/Button";
import { Users, Play, LogOut, Check, X, Trophy, Bot } from "lucide-react";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs, addDoc, serverTimestamp, limit, runTransaction } from "firebase/firestore";

export default function Menu() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [wins, setWins] = useState<number>(0);
  const [shortId, setShortId] = useState<string>("");

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Listen for current user's wins
    const userUnsub = onSnapshot(doc(db, "users", auth.currentUser.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWins(data.wins || 0);
        
        if (data.shortId) {
          setShortId(data.shortId);
        } else {
          // Generate backfill for old users
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let genId = '';
          for(let i=0; i<5; i++) {
              genId += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          await updateDoc(doc(db, "users", auth.currentUser!.uid), {
             shortId: genId
          });
          setShortId(genId);
        }
      }
    });

    // Listen for incoming game invites where player2Id is current user and status is invited
    const q = query(
      collection(db, "games"),
      where("player2Id", "==", auth.currentUser.uid),
      where("status", "==", "invited")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pending: any[] = [];
      snapshot.forEach(doc => {
        pending.push({ id: doc.id, ...doc.data() });
      });
      setInvites(pending);
    });

    return () => {
      unsubscribe();
      userUnsub();
    };
  }, []);

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await updateDoc(doc(db, "games", inviteId), {
        status: "waiting", // This will trigger Game.tsx to set it to active and start category
        updatedAt: serverTimestamp()
      });
      navigate(`/game/${inviteId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    try {
      await updateDoc(doc(db, "games", inviteId), {
        status: "rejected",
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickMatch = async () => {
    if (!auth.currentUser) return;
    setLoadingMatch(true);
    try {
      // Find open match
      const q = query(
        collection(db, "games"), 
        where("status", "==", "looking"), 
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      let matchedGameId = null;

      if (!snapshot.empty) {
        const gameDocRef = doc(db, "games", snapshot.docs[0].id);
        
        await runTransaction(db, async (transaction) => {
           const sfDoc = await transaction.get(gameDocRef);
           if (!sfDoc.exists() || sfDoc.data().status !== "looking") {
             throw new Error("Oyun zaten alınmış");
           }
           transaction.update(gameDocRef, {
              status: "waiting",
              player2Id: auth.currentUser?.uid,
              updatedAt: serverTimestamp()
           });
           matchedGameId = sfDoc.id;
        });
      }
      
      if (matchedGameId) {
        navigate(`/game/${matchedGameId}`);
      } else {
        // Create one and wait
        const newGame = await addDoc(collection(db, "games"), {
          status: "looking",
          player1Id: auth.currentUser.uid,
          player1Name: auth.currentUser.displayName,
          turn: auth.currentUser.uid,
          category: "",
          letter: "",
          player1Words: [],
          player2Words: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        navigate(`/game/${newGame.id}`);
      }
    } catch(err) {
      console.error(err);
      
      if ((err as Error).message === "Oyun zaten alınmış") {
         setTimeout(() => handleQuickMatch(), 500);
         return; 
      }
      setLoadingMatch(false);
    }
  };

  const handleBotMatch = async () => {
    if (!auth.currentUser) return;
    setLoadingMatch(true);
    try {
      const newGame = await addDoc(collection(db, "games"), {
        status: "waiting", // Go straight to waiting so Game.tsx can start it
        player1Id: auth.currentUser.uid,
        player1Name: auth.currentUser.displayName,
        player2Id: "bot",
        player2Name: "Bilgisayar",
        turn: auth.currentUser.uid,
        category: "",
        letter: "",
        player1Words: [],
        player2Words: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate(`/game/${newGame.id}`);
    } catch(err) {
      console.error(err);
      setLoadingMatch(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="p-6 pb-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <div>
            <h1 className="font-bold text-xl flex items-center gap-2">
                Ana Menü
                {shortId && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ring-1 ring-zinc-700">#{shortId}</span>}
            </h1>
            <p className="text-zinc-400 text-sm">Merhaba, <span className="text-zinc-200">{auth.currentUser?.displayName}</span></p>
            </div>
            <div className="flex flex-col items-center bg-zinc-800/80 rounded-lg px-3 py-1 ring-1 ring-white/5 shadow-inner">
                <span className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase mb-0.5">KAZANMA</span>
                <span className="text-emerald-400 font-black text-lg leading-none">{wins}</span>
            </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Çıkış Yap">
          <LogOut className="h-5 w-5 text-zinc-400" />
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {invites.length > 0 && (
          <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 space-y-3">
            <h2 className="text-sm font-semibold flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
              Oyun Davetleri
            </h2>
            <div className="space-y-2">
              {invites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between bg-zinc-950/50 p-3 rounded-lg">
                  <div className="text-sm"><span className="font-bold">{invite.player1Name || "Bir oyuncu"}</span> seni oyuna çağıyor!</div>
                  <div className="flex space-x-2">
                    <Button size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-500 text-white" onClick={() => handleAcceptInvite(invite.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-400/20" onClick={() => handleRejectInvite(invite.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button className="w-full h-14 text-base rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all border border-blue-500/50" onClick={handleQuickMatch} disabled={loadingMatch}>
          {loadingMatch ? (
            <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2"></div>
          ) : (
            <Play className="mr-2 h-5 w-5" fill="currentColor" />
          )}
          Hızlı Başla
        </Button>

        <Button variant="outline" className="w-full h-14 text-base rounded-xl bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 transition-colors" onClick={handleBotMatch} disabled={loadingMatch}>
          <Bot className="mr-2 h-5 w-5" /> Bilgisayara Karşı Oyna
        </Button>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <Button variant="outline" className="h-14 text-base rounded-xl bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors" onClick={() => navigate("/friends")}>
            <Users className="mr-2 h-5 w-5" /> Arkadaşlar
          </Button>
          
          <Button variant="outline" className="h-14 text-base rounded-xl bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition-colors" onClick={() => navigate("/leaderboard")}>
            <Trophy className="mr-2 h-5 w-5" /> Sıralama
          </Button>
        </div>
      </div>
    </div>
  );
}
