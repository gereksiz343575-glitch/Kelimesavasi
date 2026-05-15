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
    <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
      <div className="h-16 w-16 bg-zinc-800 rounded-2xl flex items-center justify-center shadow-inner mb-4">
        <Keyboard className="h-8 w-8 text-zinc-300" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Sözcük Meydanı</h1>
        <p className="text-zinc-400 text-sm">Arkadaşlarınla oynamak için bir kullanıcı adı belirle.</p>
      </div>

      <form onSubmit={handleLogin} className="w-full space-y-4">
        <div className="space-y-2 text-left">
          <label className="text-xs font-medium text-zinc-300 ml-1">Kullanıcı Adı</label>
          <Input 
            placeholder="Örn: oyuncu123" 
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={loading}
            maxLength={15}
          />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || !username.trim()}>
          {loading ? "Giriş Yapılıyor..." : "Oyuna Katıl"}
        </Button>
      </form>
    </div>
  );
}
