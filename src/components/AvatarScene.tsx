import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import Avatar from './models/Avatar';

interface SceneProps {
  player1Avatar: 'male' | 'female';
  player2Avatar: 'male' | 'female' | null;
}

export default function AvatarScene({ player1Avatar, player2Avatar }: SceneProps) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 to-zinc-950 opacity-80" />
      <Canvas shadows dpr={[1.5, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} camera={{ position: [0, 1.2, 8.5], fov: 45 }}>
        <Environment preset="city" />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#818cf8" />
        
        <Avatar gender={player1Avatar || 'male'} position={[-0.8, -0.6, 0]} isPlayer1={true} rotationY={0.3} />
        {player2Avatar ? (
            <Avatar gender={player2Avatar} position={[0.8, -0.6, 0]} isPlayer1={false} rotationY={-0.3} />
        ) : (
            <group position={[0.8, -0.6, 0]}>
                <mesh position={[0, 0.825, 0]}>
                    <cylinderGeometry args={[0.35, 0.4, 0.05, 32]} />
                    <meshStandardMaterial color="#27272a" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.855, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                   <ringGeometry args={[0.25, 0.3, 32]} />
                   <meshBasicMaterial color="#3f3f46" />
                </mesh>
            </group>
        )}

        <ContactShadows position={[0, -0.6, 0]} opacity={0.7} scale={20} blur={2} far={4} color="#000000" />
      </Canvas>
    </div>
  );
}

