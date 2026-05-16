import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion, increment } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ArrowLeft, Send, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { checkLocalDB, getPossibleWords, toTrUpperCase, CATEGORIES, LETTERS } from "../lib/wordDb";
import { motion } from "motion/react";

interface ChatItem {
  id: string;
  word: string;
  isMine: boolean;
  status: 'correct' | 'wrong';
}

export default function Game() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [word, setWord] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Unified chat feed
  const [feed, setFeed] = useState<ChatItem[]>([]);
  
  // Track game in ref for the timer 
  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (!gameId || !auth.currentUser) return;
    
    const unsubscribe = onSnapshot(doc(db, "games", gameId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGame({ id: docSnap.id, ...data });

        // Auto-join logic if someone is waiting or invited
        if (data.status === "waiting") {
          if (data.player2Id === auth.currentUser.uid) {
            joinGame();
          } else if (data.player2Id === "bot" && data.player1Id === auth.currentUser.uid) {
            joinGame();
          }
        }
      } else {
        navigate("/menu");
      }
    });

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, navigate]);

  // Sync unified feed from remote opponent words
  useEffect(() => {
    if (!game) return;
    const isPlayer1 = auth.currentUser?.uid === game.player1Id;
    const oppWords = (isPlayer1 ? game.player2Words : game.player1Words) || [];
    const myWords = (isPlayer1 ? game.player1Words : game.player2Words) || [];

    setFeed(prev => {
       let updated = [...prev];
       
       // Initial load if feed is empty
       if (updated.length === 0 && (oppWords.length > 0 || myWords.length > 0)) {
         const maxLen = Math.max(myWords.length, oppWords.length);
         for(let i=0; i<maxLen; i++) {
           if (myWords[i]) updated.push({ id: `mine-init-${i}`, word: myWords[i], isMine: true, status: 'correct' });
           if (oppWords[i]) updated.push({ id: `opp-init-${i}`, word: oppWords[i], isMine: false, status: 'correct' });
         }
         return updated;
       }

       // Delta sync for new opponent words
       const currentOppWords = updated.filter(f => !f.isMine).map(f => f.word);
       const newOpWords = oppWords.filter((w: string) => !currentOppWords.includes(w));
       
       if (newOpWords.length > 0) {
          newOpWords.forEach((w: string) => {
             updated.push({ id: Math.random().toString(), word: w, isMine: false, status: 'correct' });
          });
       }
       return updated;
    });
  }, [game?.player1Words, game?.player2Words]);

  useEffect(() => {
    // Only scroll if the last item added was 'mine' (the user typed it) or if it's initial load
    const lastItem = feed[feed.length - 1];
    if (lastItem && lastItem.isMine) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [feed]);

  const status = game?.status;
  const endsAt = game?.endsAt;

  useEffect(() => {
    if (status === 'active' && endsAt) {
      const timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timerInterval);
          handleEndGame(gameRef.current);
        }
      }, 1000);
      return () => clearInterval(timerInterval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, endsAt]);

  // Bot logic
  useEffect(() => {
    if (!game || game.status !== 'active' || game.player2Id !== 'bot') return;
    if (auth.currentUser?.uid !== game.player1Id) return;
    
    // Run bot logic periodically
    let timeoutId: NodeJS.Timeout;
    const playBot = async () => {
        const currentGame = gameRef.current;
        if (!currentGame || currentGame.status !== 'active') return;
        if (currentGame.endsAt && (currentGame.endsAt - Date.now()) <= 0) return;

        const possibleWords = getPossibleWords(currentGame.category, currentGame.letter);
        
        const usedWords = [...(currentGame.player1Words || []), ...(currentGame.player2Words || [])];
        const availableWords = possibleWords.filter((w: string) => !usedWords.includes(w));
        
        // Randomize bot activity: 60% chance to submit
        if (availableWords.length > 0 && Math.random() < 0.60) {
          const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
          try {
            await updateDoc(doc(db, "games", gameId!), {
              player2Words: arrayUnion(randomWord),
              updatedAt: serverTimestamp()
            });
          } catch (e) {
            console.error(e);
          }
        }

        // Schedule next play
        const nextDelay = Math.floor(Math.random() * 8000) + 10000; // Next move in 10-18 seconds
        timeoutId = setTimeout(playBot, nextDelay);
    };

    timeoutId = setTimeout(playBot, 6000); // 6 seconds delay for the first move

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, gameId]);

  const joinGame = async () => {
    if (!gameId || !auth.currentUser || !gameRef.current) return;
    try {
      const g = gameRef.current;
      const category = g.partyCategory || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      
      // Filter letters to only those that have at least one word in the chosen category
      let validLetters = LETTERS.filter(l => getPossibleWords(category, l).length > 0);
      
      if (validLetters.length === 0) {
        validLetters = ["A"]; // Fallback if somehow there are no words
      }
      
      const letter = validLetters[Math.floor(Math.random() * validLetters.length)];
      
      const durationSecs = g.partyDuration || 60;

      await updateDoc(doc(db, "games", gameId), {
        status: "active",
        category,
        letter,
        endsAt: Date.now() + durationSecs * 1000,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const calculateWinner = (g: any) => {
    const p1Count = g.player1Words?.length || 0;
    const p2Count = g.player2Words?.length || 0;
    if (p1Count > p2Count) return g.player1Id;
    if (p2Count > p1Count) return g.player2Id;
    return "draw";
  };

  const handleEndGame = async (gameObj: any) => {
    if (!gameId || gameObj?.status === "finished") return;
    try {
      const winnerId = calculateWinner(gameObj);
      await updateDoc(doc(db, "games", gameId), {
        status: "finished",
        winnerId,
        updatedAt: serverTimestamp()
      });

      // Update user wins if there is a winner and this player is the winner to prevent double increments.
      // Do not add wins if the opponent is a bot
      if (winnerId !== 'draw' && auth.currentUser?.uid === winnerId && gameObj.player2Id !== 'bot') {
        await updateDoc(doc(db, "users", winnerId), {
          wins: increment(1)
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !game || game.status !== "active" || timeLeft <= 0) return;

    if (game.partyMode === "sequential" && game.turn !== auth.currentUser?.uid) {
       setFeed(prev => [...prev, {id: Math.random().toString(), word: "SIRA SENDE DEĞİL!", isMine: true, status: 'wrong'}]);
       return;
    }
    
    const normalizedWord = toTrUpperCase(word.trim());
    setWord(""); // clear input instantly
    
    // Quick validation
    if (!normalizedWord.startsWith(game.letter)) {
       setFeed(prev => [...prev, {id: Math.random().toString(), word: normalizedWord, isMine: true, status: 'wrong'}]);
       return;
    }

    const isPlayer1 = auth.currentUser?.uid === game.player1Id;
    const usedWords = [...(game.player1Words || []), ...(game.player2Words || [])];
    
    if (usedWords.includes(normalizedWord) || feed.some(h => h.word === normalizedWord && (h.status === 'correct' || h.isMine))) {
       setFeed(prev => [...prev, {id: Math.random().toString(), word: normalizedWord, isMine: true, status: 'wrong'}]);
       return;
    }

    // Instant validation
    const isValid = checkLocalDB(normalizedWord, game.category);
    
    setFeed(prev => [...prev, { id: Math.random().toString(), word: normalizedWord, isMine: true, status: isValid ? 'correct' : 'wrong'}]);
    
    if (isValid) {
      const field = isPlayer1 ? 'player1Words' : 'player2Words';
      try {
        const updates: any = {
          [field]: arrayUnion(normalizedWord),
          updatedAt: serverTimestamp()
        };
        if (game.partyMode === "sequential") {
          updates.turn = isPlayer1 ? game.player2Id : game.player1Id;
        }
        await updateDoc(doc(db, "games", gameId as string), updates);
      } catch (err) {
        console.error("Update failed", err);
      }
    }
  };

  if (!game) {
    return <div className="p-8 text-center text-zinc-400">Yükleniyor...</div>;
  }

  const isPlayer1 = auth.currentUser?.uid === game.player1Id;
  const myScore = (isPlayer1 ? game.player1Words : game.player2Words)?.length || 0;
  const oppScore = (isPlayer1 ? game.player2Words : game.player1Words)?.length || 0;
  
  const amIWinner = game.winnerId === auth.currentUser?.uid;
  const isDraw = game.winnerId === 'draw';
  
  const theme = "zinc"; // Always neutral

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-zinc-950 border-zinc-900 relative">
      {/* Background gradients for flavor */}
      <div className={`absolute top-0 left-0 w-full h-64 bg-gradient-to-b opacity-40 pointer-events-none from-zinc-500/10 to-transparent z-0`}></div>
      
      <div className="absolute top-4 sm:top-5 left-4 sm:left-5 z-50 pointer-events-auto">
        <Button variant="ghost" size="icon" onClick={() => navigate("/menu")} className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 backdrop-blur-md border border-white/10 transition-all shadow-lg rounded-full h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="p-4 flex flex-col items-center justify-center z-10 pt-16 sm:pt-4 pointer-events-none">
            {game.status === 'active' && (
               <div className={`flex flex-col items-center bg-zinc-950/80 px-5 py-2 rounded-2xl border border-white/5 shadow-xl backdrop-blur-md transition-colors duration-500 ${timeLeft <= 10 ? 'ring-1 ring-red-500/50 shadow-red-500/20' : ''}`}>
                 <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Kalan Süre</span>
                 <span className={`text-[22px] font-black ${timeLeft <= 10 ? 'text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' : timeLeft <= 30 ? 'text-amber-400' : 'text-white'} leading-none tracking-tight font-mono`}>
                    00:{timeLeft.toString().padStart(2, '0')}
                 </span>
               </div>
            )}
        </div>

      { (game.status === "waiting" || game.status === "invited" || game.status === "looking") && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 z-10">
          <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-blue-500 animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <h2 className="text-xl font-semibold">Rakip Bekleniyor</h2>
          <p className="text-zinc-400 text-sm max-w-xs">
            {game.status === "looking" ? "Hızlı eşleşme için diğer oyuncular aranıyor..." : 
             game.status === "invited" ? "Arkadaşının daveti kabul etmesi bekleniyor..." : 
             "Oyun başlıyor..."}
          </p>
        </div>
      )}

      {game.status !== "waiting" && game.status !== "invited" && game.status !== "looking" && (
        <>
          <div className="px-4 sm:px-6 py-2 z-10 shrink-0">
             <div className="flex justify-between items-center p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-700/50 backdrop-blur-md relative overflow-hidden">
                 <div className="flex flex-col items-center w-1/3 z-10 relative">
                    <span className="text-[10px] uppercase font-black tracking-widest mb-1.5 text-zinc-500">Kategori</span>
                    <span className="text-[15px] font-black text-center uppercase leading-tight text-zinc-200">{game.category}</span>
                 </div>
                 <div className="flex flex-col items-center justify-center w-1/3 border-x border-zinc-700/50 space-y-1 z-10">
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Harf</span>
                    <span className="text-5xl font-black leading-none drop-shadow-xl text-white">{game.letter}</span>
                 </div>
                 <div className="flex flex-col items-center justify-center w-1/3 text-center z-10">
                    <span className="text-[10px] uppercase font-black tracking-widest mb-1.5 text-zinc-500">Hedef</span>
                    <span className="text-[11px] font-bold uppercase leading-tight text-zinc-400">En çok kelime<br/>bulan kazanır</span>
                 </div>
             </div>
          </div>

          <div className="flex-1 overflow-hidden px-4 sm:px-6 pt-2 pb-2 z-10 flex flex-col">
            <div className="flex flex-col flex-1 rounded-3xl overflow-hidden border shadow-2xl backdrop-blur-sm bg-zinc-950/50 border-zinc-800/80 shadow-black/20">
                <div className="p-4 font-medium flex items-center justify-between border-b bg-zinc-900/50 border-zinc-800/50">
                    <span className="flex items-center gap-2 text-zinc-300 font-bold">
                      Sen: <span className="text-xl">{myScore}</span>
                    </span>
                    {game.partyMode === "sequential" && (
                       <span className={`text-[12px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${game.turn === auth.currentUser?.uid ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse' : 'bg-red-500/10 text-red-400/50 border border-red-500/20'}`}>
                          {game.turn === auth.currentUser?.uid ? 'Sıra Sende' : 'Sıra Rakipte'}
                       </span>
                    )}
                    <span className="flex items-center gap-2 text-zinc-300 font-bold">
                      Rakip: <span className="text-xl">{oppScore}</span>
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                    {feed.map((item) => (
                        <motion.div 
                            key={item.id} 
                            initial={{ opacity: 0, x: item.isMine ? 10 : -10, y: 10 }} 
                            animate={{ opacity: 1, x: 0, y: 0 }} 
                            className={`flex w-full ${item.isMine ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex items-center space-x-2 p-3 rounded-2xl border font-medium text-sm max-w-[85%]
                                ${item.isMine ? 
                                    (item.status === 'correct' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-100 rounded-tr-sm' : 
                                    'bg-red-950/50 border-red-900/50 text-red-100 line-through opacity-70 rounded-tr-sm') 
                                : (item.status === 'correct' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-100 rounded-tl-sm' : 'bg-zinc-800 border-zinc-700/50 text-zinc-100 rounded-tl-sm')}
                            `}>
                                <span className="break-all">{item.word}</span>
                                {item.status === 'correct' && <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${item.isMine ? 'text-emerald-400 drop-shadow' : 'text-emerald-500'}`}/>}
                                {item.status === 'wrong' && item.isMine && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>}
                            </div>
                        </motion.div>
                    ))}
                    <div ref={bottomRef} className="h-2"/>
                </div>
            </div>
          </div>

          <div className="px-4 pt-4 bg-zinc-900 border-t border-white/5 shrink-0 z-20" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {game.status === "active" ? (
              <form onSubmit={handleSubmit} className="flex space-x-3 relative items-center max-w-sm mx-auto">
                <Input 
                  placeholder={game.partyMode === "sequential" && game.turn !== auth.currentUser?.uid ? "Rakip düşünuyor..." : "Kelime yaz ve enter'a bas..."} 
                  value={word}
                  onChange={e => setWord(e.target.value)}
                  disabled={timeLeft <= 0 || (game.partyMode === "sequential" && game.turn !== auth.currentUser?.uid)}
                  className="h-14 bg-zinc-950/80 border-white/10 text-[15px] font-medium rounded-2xl px-5 focus-visible:ring-blue-500 shadow-inner"
                  autoFocus
                />
                <Button type="submit" size="icon" className="h-14 w-14 shrink-0 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl shadow-lg shadow-blue-500/20" disabled={timeLeft <= 0 || !word.trim() || (game.partyMode === "sequential" && game.turn !== auth.currentUser?.uid)}>
                  <Send className="h-5 w-5 ml-0.5" />
                </Button>
              </form>
            ) : game.status === "finished" ? (
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className={`flex flex-col items-center p-8 rounded-[2rem] border shadow-2xl w-full max-w-sm mx-auto relative overflow-hidden
                ${amIWinner ? 'bg-gradient-to-b from-blue-900/40 to-zinc-950 border-blue-800/30' : isDraw ? 'bg-zinc-900/80 border-white/10' : 'bg-gradient-to-b from-red-900/40 to-zinc-950 border-red-800/30'} backdrop-blur-xl`}>
                
                {/* Background glow effects */}
                <div className={`absolute top-0 inset-x-0 h-32 opacity-30 blur-2xl rounded-full ${amIWinner ? 'bg-blue-500' : isDraw ? 'bg-zinc-500' : 'bg-red-500'}`} />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 to-transparent pointer-events-none" />

                <motion.div 
                  initial={{ scale: 0, rotate: -180 }} 
                  animate={{ scale: 1, rotate: 0 }} 
                  transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                  className={`flex items-center justify-center w-24 h-24 rounded-full mb-6 relative z-10 shadow-2xl
                    ${amIWinner ? 'bg-gradient-to-tr from-blue-600 to-blue-400 shadow-blue-500/30' : isDraw ? 'bg-gradient-to-tr from-zinc-600 to-zinc-400 shadow-zinc-500/30' : 'bg-gradient-to-tr from-red-600 to-red-400 shadow-red-500/30'}`}
                >
                    <Trophy className={`w-10 h-10 text-white drop-shadow-md`} />
                </motion.div>
                
                <div className={`text-2xl font-black uppercase tracking-widest text-center mb-1 relative z-10 ${amIWinner ? 'text-blue-100' : isDraw ? 'text-zinc-100' : 'text-red-100'}`}>
                  {isDraw ? 'BERABERLİK!' : amIWinner ? 'SEN KAZANDIN!' : 'RAKİP KAZANDI!'}
                </div>
                
                <div className={`text-sm font-bold tracking-wider mb-8 relative z-10 ${amIWinner ? 'text-blue-300' : isDraw ? 'text-zinc-400' : 'text-red-300'}`}>
                  Skor: {myScore} - {oppScore}
                </div>
                
                <Button variant="outline" className={`w-full h-14 rounded-2xl border transition-all shadow-sm font-black text-[15px] relative z-10 hover:-translate-y-0.5
                    ${amIWinner ? 'bg-blue-950/50 border-blue-500/30 text-blue-200 hover:bg-blue-900/60 hover:border-blue-400/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 
                      isDraw ? 'bg-zinc-900/80 border-zinc-600/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-500/50 hover:shadow-[0_0_20px_rgba(161,161,170,0.2)]' : 
                      'bg-red-950/50 border-red-500/30 text-red-200 hover:bg-red-900/60 hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]'}`} 
                    onClick={() => navigate("/menu")}>
                    Ana Menüye Dön
                </Button>
              </motion.div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

