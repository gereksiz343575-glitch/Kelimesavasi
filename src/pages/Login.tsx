import React, { useState } from "react";
import { loginAsGuest } from "../lib/firebase";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Keyboard } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setError("");
    try {
      await loginAsGuest(username.trim());
    } catch (err: any) {
      setError(err.message || "Giriş yapılamadı.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 pb-10 flex flex-col items-center justify-center text-center space-y-8">
      <div className="h-20 w-20 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl flex items-center justify-center shadow-inner shadow-white/5 border border-white/10 mt-4 relative">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <Keyboard className="h-10 w-10 text-zinc-300 drop-shadow-sm" />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">Sözcük Meydanı</h1>
        <p className="text-zinc-400 text-sm max-w-[250px] mx-auto leading-relaxed">Arkadaşlarınla oynamak için bir kullanıcı adı belirle.</p>
      </div>

      <form onSubmit={handleLogin} className="w-full space-y-5 pt-2">
        <div className="space-y-2.5 text-left">
          <label className="text-[13px] font-semibold text-zinc-300 ml-1 uppercase tracking-wider">Kullanıcı Adı</label>
          <Input 
            placeholder="Örn: oyuncu123" 
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={loading}
            maxLength={15}
            className="text-base"
          />
        </div>
        {error && <p className="text-red-400 text-xs font-medium bg-red-400/10 p-2 rounded-lg border border-red-400/20">{error}</p>}
        <Button type="submit" className="w-full h-12 text-base font-bold rounded-2xl bg-blue-500 hover:bg-blue-400 text-white shadow-xl shadow-blue-900/20 transition-all border border-blue-400/30 mt-2" disabled={loading || !username.trim()}>
          {loading ? (
             <div className="flex items-center">
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin mr-2"></div>
                Giriş Yapılıyor...
             </div>
          ) : "Oyuna Katıl"}
        </Button>
      </form>
    </div>
  );
}
