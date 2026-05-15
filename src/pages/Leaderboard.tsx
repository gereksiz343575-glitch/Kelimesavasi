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
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="p-4 border-b border-zinc-800 flex items-center shadow-lg bg-zinc-950/50 z-10 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/menu")} className="mr-4 hover:bg-zinc-800">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-xl flex items-center text-amber-500">
          <Trophy className="mr-2 h-5 w-5" /> Sıralama
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
        {loading ? (
          <div className="flex justify-center py-8">
             <div className="w-8 h-8 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-zinc-500 py-8">Henüz oyuncu yok.</p>
        ) : (
          users.map((u, index) => {
            const isTop3 = index < 3;
            
            let rankColor = "text-zinc-400";
            let bgClass = "bg-zinc-950/50 border-zinc-800";
            
            if (index === 0) {
              rankColor = "text-amber-400";
              bgClass = "bg-amber-950/30 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
            } else if (index === 1) {
              rankColor = "text-slate-300";
              bgClass = "bg-slate-900/40 border-slate-400/30";
            } else if (index === 2) {
              rankColor = "text-amber-700";
              bgClass = "bg-orange-950/20 border-orange-700/30";
            }

            return (
              <motion.div 
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-4 rounded-xl border ${bgClass}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`font-black text-xl w-8 text-center ${rankColor}`}>
                    {isTop3 ? <Medal className="h-6 w-6 mx-auto" /> : `#${index + 1}`}
                  </div>
                  <div className="font-medium text-zinc-200 text-lg">
                    {u.displayName}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-2xl font-black text-emerald-400 leading-none">{u.wins}</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Kazanma</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
