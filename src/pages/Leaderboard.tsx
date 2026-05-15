import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Button } from "../components/ui/Button";
import { ArrowLeft, Trophy, Medal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

interface UserRank {
  id: string;
  displayName: string;
  wins: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query top 50 users by wins descending where wins >= 0
    const q = query(
      collection(db, "users"),
      where("wins", ">=", 1),
      orderBy("wins", "desc"),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers: UserRank[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedUsers.push({
          id: doc.id,
          displayName: data.displayName || "Bilinmeyen Oyuncu",
          wins: data.wins || 0
        });
      });
      setUsers(fetchedUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-zinc-900/50">
      <div className="p-5 border-b border-white/5 flex items-center shadow-lg bg-zinc-900/80 z-10 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/menu")} className="mr-4 hover:bg-zinc-800 text-zinc-300">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-extrabold text-xl flex items-center text-amber-500">
          <Trophy className="mr-2 h-6 w-6" /> Sıralama
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
             <div className="w-10 h-10 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="bg-zinc-900/50 rounded-2xl p-6 text-center border border-white/5 mt-4">
            <p className="text-zinc-500 font-medium tracking-wide">Henüz oyuncu yok.</p>
          </div>
        ) : (
          users.map((u, index) => {
            const isTop3 = index < 3;
            
            let rankColor = "text-zinc-400";
            let bgClass = "bg-zinc-900/80 border-white/5";
            let nameColor = "text-zinc-200";
            
            if (index === 0) {
              rankColor = "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]";
              bgClass = "bg-amber-950/20 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/10";
              nameColor = "text-amber-100";
            } else if (index === 1) {
              rankColor = "text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.8)]";
              bgClass = "bg-slate-900/40 border-slate-400/30 ring-1 ring-slate-400/10 shadow-[0_0_15px_rgba(148,163,184,0.1)]";
              nameColor = "text-slate-100";
            } else if (index === 2) {
              rankColor = "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]";
              bgClass = "bg-orange-950/20 border-orange-700/30 ring-1 ring-orange-500/10 shadow-[0_0_15px_rgba(194,65,12,0.1)]";
              nameColor = "text-orange-100";
            }

            return (
              <motion.div 
                key={u.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-4 rounded-2xl border ${bgClass} shadow-sm backdrop-blur-sm`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`font-black text-2xl w-10 text-center ${rankColor}`}>
                    {isTop3 ? <Medal className="h-7 w-7 mx-auto" /> : `#${index + 1}`}
                  </div>
                  <div className={`font-bold text-lg ${nameColor}`}>
                    {u.displayName}
                  </div>
                </div>
                <div className="flex flex-col items-end pl-4 border-l border-white/5">
                    <span className="text-2xl font-black text-emerald-400 leading-none tracking-tight">{u.wins}</span>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mt-1">KAZANMA</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
