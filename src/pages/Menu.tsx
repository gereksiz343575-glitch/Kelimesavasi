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
      where("status", "in", ["invited", "party_invited"])
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
      const invite = invites.find(i => i.id === inviteId);
      if (invite?.status === "party_invited") {
        await updateDoc(doc(db, "games", inviteId), {
          status: "party_lobby",
          updatedAt: serverTimestamp()
        });
        navigate(`/party/${inviteId}`);
      } else {
        await updateDoc(doc(db, "games", inviteId), {
          status: "waiting", // This will trigger Game.tsx to set it to active and start category
          updatedAt: serverTimestamp()
        });
        navigate(`/game/${inviteId}`);
      }
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

  const handleCustomMatch = async () => {
    if (!auth.currentUser) return;
    setLoadingMatch(true);
    try {
      const newGame = await addDoc(collection(db, "games"), {
        status: "party_lobby",
        player1Id: auth.currentUser.uid,
        player1Name: auth.currentUser.displayName,
        player2Id: "",
        player2Name: "",
        player1Avatar: "male",
        player2Avatar: "female",
        partyDuration: 60,
        partyMode: "simultaneous", // simultaneous or sequential
        turn: auth.currentUser.uid,
        category: "",
        letter: "",
        player1Words: [],
        player2Words: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate(`/party/${newGame.id}`);
    } catch(err) {
      console.error(err);
      setLoadingMatch(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-zinc-950 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div className="p-6 pb-5 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center space-x-4">
            <div>
            <h1 className="font-extrabold text-2xl flex items-center gap-2 text-white">
                Ana Menü
                {shortId && <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full ring-1 ring-white/10 font-medium">#{shortId}</span>}
            </h1>
            <p className="text-zinc-400 text-sm mt-0.5">Merhaba, <span className="text-blue-400 font-bold">{auth.currentUser?.displayName}</span></p>
            </div>
            <div className="flex flex-col items-center bg-zinc-950/80 rounded-xl px-4 py-2 ring-1 ring-white/10 shadow-lg">
                <span className="text-[9px] text-zinc-500 font-black tracking-widest uppercase mb-0.5">KAZANMA</span>
                <span className="text-emerald-400 font-black text-xl leading-none">{wins}</span>
            </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Çıkış Yap" className="hover:bg-red-500/80 hover:text-white text-zinc-400 bg-zinc-900/60 transition-all border border-white/5">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-10 flex flex-col justify-end relative z-10 w-full max-w-sm mx-auto pointer-events-none">
        {invites.length > 0 && (
          <div className="bg-zinc-900/80 backdrop-blur-xl p-4 rounded-2xl border border-blue-500/30 space-y-3 shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-auto">
            <h2 className="text-sm font-bold flex items-center text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
              Oyun Davetleri
            </h2>
            <div className="space-y-2">
              {invites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between bg-zinc-950/80 p-3 rounded-xl border border-white/10">
                  <div className="text-sm text-zinc-300"><span className="font-bold text-white">{invite.player1Name || "Bir oyuncu"}</span> seni oyuna çağıyor!</div>
                  <div className="flex space-x-2">
                    <Button size="icon" className="h-9 w-9 bg-blue-500 hover:bg-blue-400 text-white rounded-lg shadow-md" onClick={() => handleAcceptInvite(invite.id)}>
                      <Check className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 rounded-lg" onClick={() => handleRejectInvite(invite.id)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-zinc-900/40 backdrop-blur-md p-4 rounded-3xl border border-white/10 space-y-4 pointer-events-auto shadow-2xl">
            <Button className="w-full h-14 text-[15px] font-black rounded-2xl bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all border border-blue-400/50 hover:scale-[1.02]" onClick={handleQuickMatch} disabled={loadingMatch}>
            {loadingMatch ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2"></div>
            ) : (
                <Play className="mr-2 h-5 w-5" fill="currentColor" />
            )}
            HIZLI BAŞLA
            </Button>

            <Button variant="outline" className="w-full h-14 text-[15px] font-black rounded-2xl bg-zinc-950/80 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-inner hover:scale-[1.02]" onClick={handleBotMatch} disabled={loadingMatch}>
            <Bot className="mr-2 h-5 w-5" /> BİLGİSAYARA KARŞI
            </Button>

            <Button variant="outline" className="w-full h-14 text-[15px] font-black rounded-2xl bg-zinc-950/80 border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white transition-all shadow-inner hover:scale-[1.02]" onClick={handleCustomMatch} disabled={loadingMatch}>
            <Users className="mr-2 h-5 w-5" /> ÖZEL OYUN (PARTİ)
            </Button>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 mt-2">
            <Button variant="outline" className="h-14 text-[14px] font-black rounded-2xl bg-zinc-950/80 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-inner" onClick={() => navigate("/friends")}>
                <Users className="mr-2 h-5 w-5" /> Arkadaşlar
            </Button>
            
            <Button variant="outline" className="h-14 text-[14px] font-black rounded-2xl bg-zinc-950/80 border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-inner" onClick={() => navigate("/leaderboard")}>
                <Trophy className="mr-2 h-5 w-5" /> Sıralama
            </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
