import { useEffect, useRef } from "react";
import * as THREE from "three";

function createShieldShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 2.25);
  shape.bezierCurveTo(1.2, 2, 1.78, 1.52, 1.78, 0.58);
  shape.bezierCurveTo(1.78, -0.78, 0.92, -1.78, 0, -2.24);
  shape.bezierCurveTo(-0.92, -1.78, -1.78, -0.78, -1.78, 0.58);
  shape.bezierCurveTo(-1.78, 1.52, -1.2, 2, 0, 2.25);
  return shape;
}

function createRoundedCardShape() {
  const width = 2.8;
  const height = 1.72;
  const radius = 0.18;
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
}

export function HeroThreeScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
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

    camera.position.set(0, 0.3, 9.2);
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xaec3b0, 8, 14);
    rimLight.position.set(-3.5, -1, 4);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    const shieldGeometry = new THREE.ExtrudeGeometry(createShieldShape(), {
      depth: 0.28,
      bevelEnabled: true,
      bevelSegments: 10,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      curveSegments: 40,
    });
    shieldGeometry.center();
    const shieldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x7ea07b,
      metalness: 0.18,
      roughness: 0.22,
      transmission: 0.28,
      thickness: 0.7,
      transparent: true,
      opacity: 0.82,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.rotation.set(-0.08, -0.18, 0.04);
    shield.scale.setScalar(1.28);
    group.add(shield);
    disposables.push(shieldGeometry, shieldMaterial);

    const cardGeometry = new THREE.ExtrudeGeometry(createRoundedCardShape(), {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 8,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      curveSegments: 18,
    });
    cardGeometry.center();
    const cardMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0f2a1d,
      metalness: 0.25,
      roughness: 0.34,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
    });
    const card = new THREE.Mesh(cardGeometry, cardMaterial);
    card.position.set(0.18, -0.2, 0.45);
    card.rotation.set(0.1, -0.22, -0.08);
    group.add(card);
    disposables.push(cardGeometry, cardMaterial);

    const chipGeometry = new THREE.BoxGeometry(0.48, 0.34, 0.035);
    const chipMaterial = new THREE.MeshStandardMaterial({
      color: 0xe3eed4,
      metalness: 0.55,
      roughness: 0.2,
    });
    const chip = new THREE.Mesh(chipGeometry, chipMaterial);
    chip.position.set(-0.72, -0.12, 0.55);
    chip.rotation.copy(card.rotation);
    group.add(chip);
    disposables.push(chipGeometry, chipMaterial);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x375534,
      transparent: true,
      opacity: 0.18,
    });

    const rings = [2.95, 3.55, 4.1].map((radius, index) => {
      const geometry = new THREE.TorusGeometry(radius, 0.012, 10, 180);
      const ring = new THREE.Mesh(geometry, ringMaterial);
      ring.rotation.set(Math.PI / 2.3, index * 0.42, index * 0.2);
      group.add(ring);
      disposables.push(geometry);
      return ring;
    });
    disposables.push(ringMaterial);

    const nodeGeometry = new THREE.SphereGeometry(0.09, 28, 28);
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe3eed4,
      emissive: 0x5d7d5a,
      emissiveIntensity: 0.38,
      roughness: 0.28,
    });
    const nodes = Array.from({ length: 12 }, (_, index) => {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.userData = {
        angle: (index / 12) * Math.PI * 2,
        radius: 2.48 + (index % 3) * 0.34,
        speed: 0.22 + (index % 4) * 0.045,
        y: -1.25 + (index % 5) * 0.62,
      };
      group.add(node);
      return node;
    });
    disposables.push(nodeGeometry, nodeMaterial);

    const barMaterial = new THREE.MeshStandardMaterial({
      color: 0xaec3b0,
      emissive: 0x375534,
      emissiveIntensity: 0.16,
      roughness: 0.45,
    });
    const bars = Array.from({ length: 7 }, (_, index) => {
      const geometry = new THREE.BoxGeometry(0.12, 0.5 + index * 0.08, 0.08);
      const bar = new THREE.Mesh(geometry, barMaterial);
      bar.position.set(-1.45 + index * 0.28, -1.12 + index * 0.045, 0.66);
      bar.rotation.copy(card.rotation);
      group.add(bar);
      disposables.push(geometry);
      return bar;
    });
    disposables.push(barMaterial);

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
        group.rotation.y = Math.sin(elapsed * 0.32) * 0.18;
        group.rotation.x = Math.sin(elapsed * 0.24) * 0.06;
        shield.rotation.z = Math.sin(elapsed * 0.38) * 0.045;
        card.position.y = -0.2 + Math.sin(elapsed * 0.8) * 0.05;

        rings.forEach((ring, index) => {
          ring.rotation.z += 0.0018 + index * 0.0007;
          ring.rotation.x += 0.0006;
        });

        nodes.forEach((node) => {
          const angle = node.userData.angle + elapsed * node.userData.speed;
          node.position.set(
            Math.cos(angle) * node.userData.radius,
            node.userData.y + Math.sin(angle * 1.7) * 0.16,
            Math.sin(angle) * 0.96
          );
        });

        bars.forEach((bar, index) => {
          bar.scale.y = 0.78 + Math.sin(elapsed * 1.35 + index * 0.7) * 0.2;
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
  }, []);

  return (
    <div className="hero-three-scene" aria-hidden="true" ref={hostRef}>
      <span className="sr-only">Animated 3D banking protection shield</span>
    </div>
  );
}
