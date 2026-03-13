import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function createPencil() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.1, 12),
    new THREE.MeshStandardMaterial({ color: '#f4d35e', roughness: 0.4, metalness: 0.05 })
  );

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: '#d9a066', roughness: 0.7, metalness: 0 })
  );
  tip.position.y = -0.65;

  const lead = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.8, metalness: 0 })
  );
  lead.position.y = -0.78;

  const eraser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.16, 12),
    new THREE.MeshStandardMaterial({ color: '#ff6f91', roughness: 0.5, metalness: 0 })
  );
  eraser.position.y = 0.63;

  group.add(body, tip, lead, eraser);
  return group;
}

function createPaintPalette() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.06, 32),
    new THREE.MeshStandardMaterial({ color: '#f9e2ae', roughness: 0.8, metalness: 0 })
  );

  const colors = ['#ff5d8f', '#ffd166', '#00c2a8', '#5d9cec', '#9b5de5'];
  colors.forEach((hex, idx) => {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 12),
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.3, metalness: 0.1 })
    );
    const angle = (idx / colors.length) * Math.PI * 2;
    dot.position.set(Math.cos(angle) * 0.18, 0.05, Math.sin(angle) * 0.18);
    group.add(dot);
  });

  group.add(base);
  return group;
}

function createToyBall() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 18),
    new THREE.MeshStandardMaterial({
      color: '#5ad1ff',
      roughness: 0.2,
      metalness: 0.1,
      emissive: '#1f7a8c',
      emissiveIntensity: 0.1
    })
  );
  return mesh;
}

function createFrame() {
  const group = new THREE.Group();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.36, 0.03),
    new THREE.MeshStandardMaterial({ color: '#7f5539', roughness: 0.7, metalness: 0.1 })
  );

  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.26),
    new THREE.MeshStandardMaterial({ color: '#ffd166', roughness: 0.5, metalness: 0 })
  );
  art.position.z = 0.02;

  group.add(frame, art);
  return group;
}

function createSpark() {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.06, 0),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#8ecae6',
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.3
    })
  );
  return mesh;
}

export default function ThreeSceneBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.1, 5.8);

    const ambient = new THREE.AmbientLight('#ffffff', 0.8);
    const key = new THREE.DirectionalLight('#fefae0', 1.1);
    key.position.set(3, 4, 5);
    const rim = new THREE.PointLight('#72ddf7', 1.3, 10, 2);
    rim.position.set(-2.5, 2, 2);

    scene.add(ambient, key, rim);

    const objects = [];
    const mobileCount = window.innerWidth < 768 ? 18 : 32;

    for (let i = 0; i < mobileCount; i += 1) {
      let object;
      const pick = i % 5;
      if (pick === 0) object = createPencil();
      else if (pick === 1) object = createPaintPalette();
      else if (pick === 2) object = createToyBall();
      else if (pick === 3) object = createFrame();
      else object = createSpark();

      object.position.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 8,
        -Math.random() * 6
      );

      object.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const scale = 0.55 + Math.random() * 0.75;
      object.scale.setScalar(scale);

      object.userData = {
        speedX: (Math.random() - 0.5) * 0.004,
        speedY: 0.002 + Math.random() * 0.004,
        spinX: (Math.random() - 0.5) * 0.01,
        spinY: (Math.random() - 0.5) * 0.012,
        offset: Math.random() * Math.PI * 2
      };

      scene.add(object);
      objects.push(object);
    }

    const clock = new THREE.Clock();
    let frameId;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      objects.forEach((item) => {
        item.position.x += item.userData.speedX;
        item.position.y += item.userData.speedY;
        item.rotation.x += item.userData.spinX;
        item.rotation.y += item.userData.spinY;
        item.position.z = -2.4 + Math.sin(elapsed + item.userData.offset) * 1.8;

        if (item.position.y > 5) item.position.y = -5;
        if (item.position.x > 9) item.position.x = -9;
        if (item.position.x < -9) item.position.x = 9;
      });

      camera.position.x = Math.sin(elapsed * 0.15) * 0.2;
      camera.position.y = Math.cos(elapsed * 0.2) * 0.08;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameId);

      objects.forEach((obj) => {
        obj.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });

      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className="three-scene-bg" ref={mountRef} aria-hidden="true" />;
}
