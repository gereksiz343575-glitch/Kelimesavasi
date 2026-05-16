import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import Avatar from './models/Avatar';
import { useRef } from 'react';

function AnimatedPlaceholder() {
  const meshRef1 = useRef<THREE.Mesh>(null);
  const meshRef2 = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    // Smooth color animation (blue to purple)
    const hue = (Math.sin(time * 0.5) + 1) * 0.5 * 0.2 + 0.55; 
    const color = new THREE.Color().setHSL(hue, 1, 0.6);
    
    if (meshRef1.current) {
        (meshRef1.current.material as THREE.MeshBasicMaterial).color.copy(color);
        (meshRef1.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.sin(time * 1.5) * 0.02;
    }
    if (meshRef2.current) {
        (meshRef2.current.material as THREE.MeshBasicMaterial).color.copy(color);
        (meshRef2.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.cos(time * 1.2) * 0.05;
    }
    if (ringRef.current) {
        (ringRef.current.material as THREE.MeshBasicMaterial).color.copy(color);
        ringRef.current.rotation.z = time * 0.5;
    }
  });

  return (
    <group position={[0.55, -0.6, 0]}>
        {/* Empty Player 2 Slot Placeholder - Teleport Pad */}
        <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.4, 0.45, 0.05, 64]} />
            <meshStandardMaterial color="#09090b" roughness={0.5} metalness={0.8} />
        </mesh>
        <mesh ref={ringRef} position={[0, 0.046, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.28, 0.35, 64]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={meshRef1} position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.35, 0.4, 1.2, 64, 1, true]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.08} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh ref={meshRef2} position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.3, 0.35, 1.2, 64, 1, true]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
    </group>
  );
}

interface SceneProps {
  player1Avatar: 'male' | 'female';
  player1Name?: string;
  player2Avatar: 'male' | 'female' | null;
  player2Name?: string;
}

export default function AvatarScene({ player1Avatar, player1Name, player2Avatar, player2Name }: SceneProps) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 to-zinc-950 opacity-80" />
      <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1.5, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} camera={{ position: [0, 1.0, 10], fov: 40 }}>
        <Environment preset="city" />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#818cf8" />
        
        <Avatar name={player1Name} gender={player1Avatar || 'male'} position={[-0.55, -0.6, 0]} isPlayer1={true} rotationY={0.3} />
        {player2Avatar ? (
            <Avatar name={player2Name} gender={player2Avatar} position={[0.55, -0.6, 0]} isPlayer1={false} rotationY={-0.3} />

        ) : (
            <AnimatedPlaceholder />
        )}

        <ContactShadows position={[0, -0.6, 0]} opacity={0.7} scale={20} blur={2} far={4} color="#000000" />
      </Canvas>
    </div>
  );
}

