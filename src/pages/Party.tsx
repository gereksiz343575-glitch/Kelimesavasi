import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, onSnapshot, collection, query, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Button } from "../components/ui/Button";
import { Settings, Play, ArrowLeft, Users, UserPlus, X, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { CATEGORIES } from "../data/categories";
import AvatarScene from "../components/AvatarScene";

export default function Party() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isOwner = party?.player1Id === auth.currentUser?.uid;

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "games", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setParty(data);
        if (data.status === "waiting") {
          navigate(`/game/${id}`);
        }
      } else {
        navigate("/menu");
      }
      setLoading(false);
    });

    const fetchFriends = async () => {
      const q = query(collection(db, "users", auth.currentUser!.uid, "friends"));
      const snapshot = await getDocs(q);
      const friendsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFriends(friendsList);
    };
    fetchFriends();

    return () => unsub();
  }, [id, navigate]);

  const handleStart = async () => {
    if (!isOwner || !party.player2Id) return;
    await updateDoc(doc(db, "games", id!), {
      status: "waiting"
    });
  };

  const updateSetting = async (key: string, value: any) => {
    if (!isOwner) return;
    await updateDoc(doc(db, "games", id!), {
      [key]: value
    });
  };

  const selectAvatar = async (avatar: string) => {
    const key = isOwner ? "player1Avatar" : "player2Avatar";
    await updateDoc(doc(db, "games", id!), {
      [key]: avatar
    });
  };

  const inviteFriend = async (friendId: string, friendName: string) => {
    if (!isOwner) return;
    await updateDoc(doc(db, "games", id!), {
      player2Id: friendId,
      player2Name: friendName,
      status: "party_invited"
    });
    setShowInviteModal(false);
  };

  const leaveParty = async () => {
    if (isOwner) {
      await updateDoc(doc(db, "games", id!), { status: "cancelled" });
    } else {
      await updateDoc(doc(db, "games", id!), { 
        player2Id: "", 
        player2Name: "", 
        status: "party_lobby" 
      });
    }
    navigate("/menu");
  };

  if (loading || !party) return <div className="h-full bg-zinc-950 flex justify-center items-center"><div className="w-8 h-8 rounded-full border-2 border-zinc-500 border-t-white animate-spin" /></div>;

  const currentAvatar = isOwner ? (party.player1Avatar || 'male') : (party.player2Avatar || 'male');

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-zinc-950 relative">
      
      {/* Back Button */}
      <div className="absolute top-4 sm:top-5 left-4 sm:left-5 z-50 pointer-events-auto">
          <Button variant="ghost" size="icon" onClick={leaveParty} className="bg-zinc-900/80 hover:bg-red-500 hover:text-white text-zinc-300 backdrop-blur-md border border-white/10 transition-all shadow-lg rounded-full h-10 w-10">
             <ArrowLeft className="h-5 w-5" />
          </Button>
      </div>

      {/* Top Bar */}
      <div className="p-3 sm:p-5 pt-16 sm:pt-16 flex items-center justify-center z-10 shrink-0 relative bg-zinc-950/40 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center">
            <h1 className="font-black text-xl flex items-center text-white drop-shadow-md tracking-tight">
               <div className="bg-zinc-800 text-zinc-300 p-1.5 rounded-xl mr-3 shadow-md border border-white/10 ring-1 ring-black/20">
                 <Users className="h-5 w-5" />
               </div>
               PARTİ LOBİSİ
            </h1>
        </div>
      </div>

      {/* Character Safe Area (3D Scene) */}
      <div className="flex-1 relative z-0 w-full">
        <AvatarScene 
          player1Avatar={party.player1Avatar} 
          player2Avatar={party.player2Id ? party.player2Avatar : null} 
        />

        {/* Floating Name Tags */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-between items-end px-4 sm:px-8 z-10 pointer-events-none">
            <div className="flex flex-col items-center pointer-events-auto">
               <span className="bg-zinc-950/80 backdrop-blur-sm text-blue-400 font-bold px-4 py-1.5 rounded-full border border-blue-500/30 shadow-lg">{party.player1Name}</span>
               {isOwner && (
                 <div className="flex mt-2 bg-zinc-950/80 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg relative overflow-hidden">
                    <div className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg transition-transform duration-300 ease-out ${currentAvatar === 'male' ? 'translate-x-0 bg-blue-500 shadow-md' : 'translate-x-full bg-pink-500 shadow-md'}`} style={{ zIndex: 0 }}></div>
                    <button onClick={() => selectAvatar('male')} className={`relative z-10 px-4 py-1.5 rounded-lg text-[11px] font-black tracking-widest transition-all w-20 flex justify-center items-center ${currentAvatar === 'male' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>ERKEK</button>
                    <button onClick={() => selectAvatar('female')} className={`relative z-10 px-4 py-1.5 rounded-lg text-[11px] font-black tracking-widest transition-all w-20 flex justify-center items-center ${currentAvatar === 'female' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>KADIN</button>
                 </div>
               )}
            </div>
            
            <div className="flex flex-col items-center pointer-events-auto">
               {party.player2Id ? (
                  <>
                    <span className="bg-zinc-950/80 backdrop-blur-sm text-red-400 font-bold px-4 py-1.5 rounded-full border border-red-500/30 shadow-lg">{party.player2Name}</span>
                    {!isOwner && (
                      <div className="flex mt-2 bg-zinc-950/80 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg relative overflow-hidden">
                         <div className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg transition-transform duration-300 ease-out ${currentAvatar === 'male' ? 'translate-x-0 bg-blue-500 shadow-md' : 'translate-x-full bg-pink-500 shadow-md'}`} style={{ zIndex: 0 }}></div>
                         <button onClick={() => selectAvatar('male')} className={`relative z-10 px-4 py-1.5 rounded-lg text-[11px] font-black tracking-widest transition-all w-20 flex justify-center items-center ${currentAvatar === 'male' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>ERKEK</button>
                         <button onClick={() => selectAvatar('female')} className={`relative z-10 px-4 py-1.5 rounded-lg text-[11px] font-black tracking-widest transition-all w-20 flex justify-center items-center ${currentAvatar === 'female' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>KADIN</button>
                      </div>
                    )}
                    {isOwner && (
                      <button onClick={() => updateSetting('player2Id', '')} className="mt-2 text-[10px] text-red-400 bg-zinc-950/80 backdrop-blur-sm px-3 py-1 rounded-full border border-red-500/20 font-bold tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all shadow-md">ÇIKAR</button>
                    )}
                  </>
               ) : (
                  <button onClick={() => isOwner && setShowInviteModal(true)} disabled={!isOwner} className="bg-zinc-900/60 backdrop-blur-md border border-dashed border-zinc-600/50 hover:border-zinc-400 hover:bg-zinc-800/80 text-zinc-400 text-[13px] rounded-full px-4 py-1.5 font-semibold flex items-center transition-all group pointer-events-auto">
                      <UserPlus className="w-4 h-4 mr-2" /> Arkadaş Davet Et
                  </button>
               )}
            </div>
        </div>
      </div>

      {/* Bottom CS2-style Panel */}
      <div className="relative z-20 shrink-0 bg-zinc-950/80 backdrop-blur-md px-4 pt-4 border-t border-white/10" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
         <div className="absolute bottom-full left-0 right-0 h-16 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none" />
         <div className="flex flex-col space-y-3 relative z-10 pointer-events-auto max-w-sm mx-auto w-full pb-2">
              
              {/* Settings Section */}
              <div className="bg-zinc-900/60 rounded-2xl p-4 border border-white/10 shadow-2xl w-full transition-all">
                  <button 
                    className="flex w-full items-center justify-between text-zinc-300 font-bold text-xs tracking-widest uppercase focus:outline-none px-1"
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  >
                      <div className="flex items-center">
                          <Settings className="w-4 h-4 mr-2" /> Oda Ayarları
                      </div>
                      <div className="text-zinc-500">
                          {isSettingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                  </button>
                  
                  {isSettingsOpen && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Süre */}
                      <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">Süre Limit</label>
                          <div className="flex space-x-2">
                              {[30, 60, 90].map(val => (
                                  <button 
                                      key={val}
                                      disabled={!isOwner}
                                      onClick={() => updateSetting('partyDuration', val)}
                                      className={`flex-1 h-9 rounded-lg text-xs font-black border-2 transition-all ${party.partyDuration === val ? 'bg-zinc-800 text-white border-zinc-500 shadow-md scale-[1.02]' : 'bg-zinc-950/50 text-zinc-500 border-transparent hover:bg-zinc-800/50 hover:text-zinc-300'}`}
                                  >{val}sn</button>
                              ))}
                          </div>
                      </div>

                      {/* Mod */}
                      <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">Oyun Modu</label>
                          <div className="flex space-x-2">
                              <button 
                                  disabled={!isOwner}
                                  onClick={() => updateSetting('partyMode', 'simultaneous')}
                                  className={`flex-1 h-9 rounded-lg text-xs font-black border-2 transition-all ${party.partyMode === 'simultaneous' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.02]' : 'bg-zinc-950/50 text-zinc-500 border-transparent hover:bg-zinc-800/50 hover:text-zinc-300'}`}
                              >Aynı Anda</button>
                              <button 
                                  disabled={!isOwner}
                                  onClick={() => updateSetting('partyMode', 'sequential')}
                                  className={`flex-1 h-9 rounded-lg text-xs font-black border-2 transition-all ${party.partyMode === 'sequential' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] scale-[1.02]' : 'bg-zinc-950/50 text-zinc-500 border-transparent hover:bg-zinc-800/50 hover:text-zinc-300'}`}
                              >Sırayla</button>
                          </div>
                      </div>

                      {/* Kategori */}
                      <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">Kategori</label>
                          <div className="flex overflow-x-auto space-x-2 pb-1.5 -mx-1 px-1 scrollbar-hide">
                              <button 
                                  disabled={!isOwner}
                                  onClick={() => updateSetting('partyCategory', '')}
                                  className={`h-9 px-4 rounded-lg text-xs font-black whitespace-nowrap border-2 transition-all ${!party.partyCategory ? 'bg-zinc-100 text-zinc-950 border-white shadow-md' : 'bg-zinc-950/50 text-zinc-500 border-transparent hover:bg-zinc-800/50 hover:text-zinc-300'}`}
                              >Rastgele</button>
                              {CATEGORIES.map(cat => (
                                <button 
                                      key={cat}
                                      disabled={!isOwner}
                                      onClick={() => updateSetting('partyCategory', cat)}
                                      className={`h-9 px-4 rounded-lg text-xs font-black whitespace-nowrap border-2 transition-all ${party.partyCategory === cat ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-zinc-950/50 text-zinc-500 border-transparent hover:bg-zinc-800/50 hover:text-zinc-300'}`}
                                  >{cat}</button>
                              ))}
                          </div>
                      </div>
                  </div>
                  )}
              </div>

              {/* Start Button */}
              {isOwner && party.player2Id ? (
                <Button onClick={handleStart} className="w-full max-w-sm mx-auto h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-400/50 transition-all hover:scale-[1.02]">
                    <Play className="w-5 h-5 mr-2 fill-white" />
                    BAŞLAT
                </Button>
              ) : (
                <div className="w-full max-w-sm mx-auto h-14 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center text-zinc-400 font-bold text-xs tracking-widest backdrop-blur-md">
                    {isOwner ? "RAKİP BEKLENİYOR..." : "LİDERİN BAŞLATMASI BEKLENİYOR..."}
                </div>
              )}
            </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-0">
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full h-[70vh] sm:h-auto sm:max-h-[80vh] bg-zinc-900 border-x border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-bold text-lg px-2 text-white">Arkadaş Davet Et</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowInviteModal(false)} className="text-zinc-400 hover:bg-zinc-800">
                  <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
               {friends.length === 0 ? (
                 <p className="text-center text-zinc-500 py-10">Listen boş.</p>
               ) : (
                 friends.map(friend => (
                   <div key={friend.id} className="p-3 bg-zinc-800/50 rounded-xl border border-white/5 flex justify-between items-center">
                      <span className="font-bold text-zinc-200 ml-2">{friend.displayName}</span>
                      <Button size="sm" onClick={() => inviteFriend(friend.friendId, friend.displayName)} className="bg-blue-500 hover:bg-blue-400 text-white shadow-md">Davet Et</Button>
                   </div>
                 ))
               )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
