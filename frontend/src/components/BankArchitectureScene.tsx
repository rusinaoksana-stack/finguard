import { useEffect, useRef } from "react";
import * as THREE from "three";

type BankArchitectureSceneProps = {
  tone?: "light" | "dark";
};

export function BankArchitectureScene({ tone = "light" }: BankArchitectureSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    let renderer: THREE.WebGLRenderer;
    const clock = new THREE.Clock();
    const disposables: Array<{ dispose: () => void }> = [];

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    camera.position.set(0, 0, 12);
    scene.add(new THREE.AmbientLight(0xffffff, tone === "light" ? 2.3 : 1.2));

    const keyLight = new THREE.DirectionalLight(0xffffff, tone === "light" ? 3.2 : 1.6);
    keyLight.position.set(5, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(tone === "light" ? 0xffffff : 0x9fb7d4, 6, 18);
    rimLight.position.set(-5, -2, 5);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    const slatGeometry = new THREE.BoxGeometry(3.2, 0.16, 0.62);
    const slatMaterial = new THREE.MeshPhysicalMaterial({
      color: tone === "light" ? 0xf7f7f5 : 0x151515,
      roughness: tone === "light" ? 0.42 : 0.58,
      metalness: tone === "light" ? 0.08 : 0.22,
      clearcoat: tone === "light" ? 0.55 : 0.2,
      transparent: true,
      opacity: tone === "light" ? 0.94 : 0.78,
    });

    const slats = Array.from({ length: 92 }, (_, index) => {
      const mesh = new THREE.Mesh(slatGeometry, slatMaterial);
      const progress = index / 91;
      const angle = progress * Math.PI * 2.65 - 1.4;
      const radius = 2.62 + Math.sin(progress * Math.PI * 4) * 0.34;

      mesh.position.set(Math.cos(angle) * radius, (progress - 0.5) * 8.9, Math.sin(angle) * 1.85);
      mesh.rotation.set(0.48 + Math.sin(angle) * 0.26, angle + Math.PI / 2, progress * Math.PI * 1.5);
      mesh.scale.set(1 + Math.sin(progress * Math.PI) * 0.34, 1, 1);
      group.add(mesh);
      return mesh;
    });

    disposables.push(slatGeometry, slatMaterial);

    const glassGeometry = new THREE.BoxGeometry(2.25, 3.15, 0.18);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: tone === "light" ? 0xdce7ef : 0x44515e,
      metalness: 0.2,
      roughness: 0.12,
      transmission: tone === "light" ? 0.32 : 0.12,
      transparent: true,
      opacity: tone === "light" ? 0.34 : 0.24,
      clearcoat: 0.85,
    });

    const towers = [-1.35, -0.35, 0.65, 1.55].map((x, index) => {
      const tower = new THREE.Mesh(glassGeometry, glassMaterial);
      tower.position.set(x, -1.1 + index * 0.32, -0.2 - index * 0.18);
      tower.rotation.set(0.02, -0.12, 0.02);
      tower.scale.set(0.72, 0.82 + index * 0.14, 1);
      group.add(tower);
      return tower;
    });

    disposables.push(glassGeometry, glassMaterial);

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const render = () => {
      const elapsed = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        group.rotation.y = Math.sin(elapsed * 0.18) * 0.12;
        group.rotation.z = Math.sin(elapsed * 0.12) * 0.035;

        slats.forEach((mesh, index) => {
          mesh.position.x += Math.sin(elapsed * 0.4 + index * 0.08) * 0.0008;
        });

        towers.forEach((tower, index) => {
          tower.position.y += Math.sin(elapsed * 0.28 + index) * 0.0008;
        });
      }

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };

    let frameId = 0;
    resize();
    render();

    const observer = new ResizeObserver(resize);
    observer.observe(host);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
      disposables.forEach((item) => item.dispose());
    };
  }, [tone]);

  return <div className="air-architecture-scene" ref={hostRef} aria-hidden="true" />;
}
