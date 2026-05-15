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
  
  const theme = myScore > oppScore ? "blue" : oppScore > myScore ? "red" : "zinc";

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-zinc-900 border-zinc-800 transition-colors duration-1000 relative">
      {/* Background gradients for flavor */}
      <div className={`absolute top-0 left-0 w-full h-64 bg-gradient-to-b opacity-40 transition-colors duration-1000 pointer-events-none 
        ${theme === 'blue' ? 'from-blue-600/20' : theme === 'red' ? 'from-red-600/20' : 'from-zinc-500/10'} to-transparent z-0`}></div>
      
      <div className="p-4 flex items-center justify-between z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/menu")} className="hover:bg-zinc-800 text-zinc-300 focus:bg-zinc-800 shadow-none ring-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col items-center">
            {game.status === 'active' && (
               <div className={`flex flex-col items-center bg-zinc-950/80 px-5 py-2 rounded-2xl border border-white/5 shadow-xl backdrop-blur-md transition-colors duration-500 ${timeLeft <= 10 ? 'ring-1 ring-red-500/50 shadow-red-500/20' : ''}`}>
                 <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Kalan Süre</span>
                 <span className={`text-[22px] font-black ${timeLeft <= 10 ? 'text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' : timeLeft <= 30 ? 'text-amber-400' : 'text-white'} leading-none tracking-tight font-mono`}>
                    00:{timeLeft.toString().padStart(2, '0')}
                 </span>
               </div>
            )}
        </div>
        <div className="w-10"></div> {/* Spacer to center the timer */}
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
          <div className="px-6 py-2 z-10 shrink-0">
             <div className={`flex justify-between items-center p-5 rounded-3xl shadow-lg transition-all duration-700 relative overflow-hidden
                 ${theme === 'blue' ? 'bg-gradient-to-br from-blue-900/40 to-blue-950/40 border border-blue-800/40 shadow-[0_8px_30px_rgba(37,99,235,0.15)]' : 
                   theme === 'red' ? 'bg-gradient-to-br from-red-900/40 to-red-950/40 border border-red-800/40 shadow-[0_8px_30px_rgba(220,38,38,0.15)]' : 
                   'bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-700/50 shadow-[0_8px_30px_rgba(0,0,0,0.2)]'} backdrop-blur-md`}>
                 <div className="flex flex-col items-center w-1/3 z-10 relative">
                    <span className={`text-[10px] uppercase font-black tracking-widest mb-1.5 transition-colors duration-500 ${theme === 'blue' ? 'text-blue-400/70' : theme === 'red' ? 'text-red-400/70' : 'text-zinc-500'}`}>Kategori</span>
                    <span className={`text-[15px] font-black text-center uppercase transition-colors duration-500 leading-tight ${theme === 'blue' ? 'text-blue-300' : theme === 'red' ? 'text-red-300' : 'text-zinc-200'}`}>{game.category}</span>
                 </div>
                 <div className={`flex flex-col items-center justify-center w-1/3 border-x transition-colors duration-700 space-y-1 z-10 ${theme === 'blue' ? 'border-blue-700/30' : theme === 'red' ? 'border-red-700/30' : 'border-zinc-700/50'}`}>
                    <span className={`text-[10px] uppercase font-black tracking-widest transition-colors duration-500 ${theme === 'blue' ? 'text-blue-400/70' : theme === 'red' ? 'text-red-400/70' : 'text-zinc-500'}`}>Harf</span>
                    <span className={`text-5xl font-black transition-colors duration-500 leading-none drop-shadow-xl ${theme === 'blue' ? 'text-blue-100' : theme === 'red' ? 'text-red-100' : 'text-white'}`}>{game.letter}</span>
                 </div>
                 <div className="flex flex-col items-center justify-center w-1/3 text-center z-10">
                    <span className={`text-[10px] uppercase font-black tracking-widest mb-1.5 transition-colors duration-500 ${theme === 'blue' ? 'text-blue-400/70' : theme === 'red' ? 'text-red-400/70' : 'text-zinc-500'}`}>Hedef</span>
                    <span className={`text-[11px] font-bold uppercase leading-tight transition-colors duration-500 ${theme === 'blue' ? 'text-blue-200/80' : theme === 'red' ? 'text-red-200/80' : 'text-zinc-400'}`}>En çok kelime<br/>bulan kazanır</span>
                 </div>
             </div>
          </div>

          <div className="flex-1 overflow-hidden p-6 pt-2 z-10 flex flex-col">
            <div className={`flex flex-col flex-1 rounded-3xl overflow-hidden border shadow-2xl transition-all duration-700 backdrop-blur-sm
                ${myScore > oppScore ? 'bg-blue-950/20 border-blue-900/30 shadow-blue-900/5' : oppScore > myScore ? 'bg-red-950/20 border-red-900/30 shadow-red-900/5' : 'bg-zinc-950/50 border-zinc-800/80 shadow-black/20'}`}>
                <div className={`p-4 font-medium flex items-center justify-between border-b transition-all duration-700
                    ${myScore > oppScore ? 'bg-blue-900/20 border-blue-900/20' : oppScore > myScore ? 'bg-red-900/20 border-red-900/20' : 'bg-zinc-900/50 border-zinc-800/50'}
                `}>
                    <span className={`transition-all duration-500 flex items-center gap-2 ${myScore > oppScore ? 'text-blue-400 scale-105 font-black drop-shadow-[0_0_12px_rgba(59,130,246,0.6)] origin-left' : myScore < oppScore ? 'text-red-400/60 font-bold' : 'text-zinc-400 font-bold'}`}>
                      Sen: <span className="text-xl">{myScore}</span>
                    </span>
                    {game.partyMode === "sequential" && (
                       <span className={`text-[12px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${game.turn === auth.currentUser?.uid ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse' : 'bg-red-500/10 text-red-400/50 border border-red-500/20'}`}>
                          {game.turn === auth.currentUser?.uid ? 'Sıra Sende' : 'Sıra Rakipte'}
                       </span>
                    )}
                    <span className={`transition-all duration-500 flex items-center gap-2 ${oppScore > myScore ? 'text-red-400 scale-105 font-black drop-shadow-[0_0_12px_rgba(244,63,94,0.6)] origin-right' : oppScore < myScore ? 'text-blue-400/60 font-bold' : 'text-zinc-400 font-bold'}`}>
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
                                    (item.status === 'correct' ? 'bg-blue-950/50 border-blue-900/50 text-blue-100 rounded-tr-sm' : 
                                    'bg-red-950/50 border-red-900/50 text-red-100 line-through opacity-70 rounded-tr-sm') 
                                : 'bg-zinc-800 border-zinc-700/50 text-zinc-100 rounded-tl-sm'}
                            `}>
                                <span className="break-all">{item.word}</span>
                                {item.status === 'correct' && <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${item.isMine ? 'text-blue-400 drop-shadow' : 'text-blue-500'}`}/>}
                                {item.status === 'wrong' && item.isMine && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>}
                            </div>
                        </motion.div>
                    ))}
                    <div ref={bottomRef} className="h-2"/>
                </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-900 border-t border-white/5 shrink-0 z-20">
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
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
                className={`flex flex-col items-center p-6 rounded-2xl border shadow-2xl 
                ${amIWinner ? 'bg-blue-950/40 border-blue-900/50' : isDraw ? 'bg-zinc-950 border-zinc-800' : 'bg-rose-950/40 border-rose-900/50'}`}>
                
                <Trophy className={`w-16 h-16 mb-3 drop-shadow-lg ${amIWinner ? 'text-blue-400' : isDraw ? 'text-zinc-400' : 'text-rose-400'}`} />
                
                <div className={`text-2xl font-black uppercase tracking-widest text-center ${amIWinner ? 'text-blue-400' : isDraw ? 'text-zinc-300' : 'text-rose-400'}`}>
                  {isDraw ? 'BERABERLİK!' : amIWinner ? 'SEN KAZANDIN!' : 'RAKİP KAZANDI!'}
                </div>
                
                <div className="mt-2 text-zinc-400 text-sm font-medium">
                  Skor: {myScore} - {oppScore}
                </div>
                
                <Button variant="outline" className="mt-6 w-full max-w-xs h-12 rounded-xl border-zinc-700 hover:bg-zinc-800" onClick={() => navigate("/menu")}>
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

