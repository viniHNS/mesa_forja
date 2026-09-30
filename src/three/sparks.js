import * as THREE from 'three';

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Faíscas de solda: partículas com gravidade e quique no chão (coordenadas em metros).
export class Sparks {
  constructor(max = 900) {
    this.max = max;
    this.cursor = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max).fill(1);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.014,
        map: dotTexture(),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    // sem culling porque as posições mudam todo frame; por isso fica invisível (sem draw)
    // enquanto não há partículas vivas
    this.points.frustumCulled = false;
    this.points.visible = false;
    // A luz fica sempre na cena com intensidade 0 em repouso: esconder a luz mudaria a
    // contagem de luzes e forçaria recompilar os shaders de todos os materiais a cada solda.
    this.light = new THREE.PointLight(0xff8a2a, 0, 1.2, 2);
    this.alive = 0;
  }

  emit(at, count = 34) {
    for (let n = 0; n < count; n++) {
      const i = this.cursor++ % this.max;
      this.pos.set([at.x, at.y, at.z], i * 3);
      const a = Math.random() * Math.PI * 2;
      const s = 0.4 + Math.random() * 1.3;
      this.vel.set([Math.cos(a) * s, 0.3 + Math.random() * 1.6, Math.sin(a) * s], i * 3);
      this.life[i] = this.maxLife[i] = 0.3 + Math.random() * 0.55;
    }
    this.light.position.copy(at);
    this.light.intensity = 2.5;
    this.alive = 1.2;
    this.points.visible = true;
  }

  update(dt) {
    if (this.alive <= 0) return;
    this.alive -= dt;
    if (this.alive <= 0) {
      // todas as partículas já morreram (vida máxima < alive inicial): para de desenhar
      this.life.fill(0);
      this.points.visible = false;
      this.light.intensity = 0;
      return;
    }
    const { pos, vel, col, life } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) {
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
        continue;
      }
      life[i] -= dt;
      const j = i * 3;
      vel[j + 1] -= 5.5 * dt;
      pos[j] += vel[j] * dt;
      pos[j + 1] += vel[j + 1] * dt;
      pos[j + 2] += vel[j + 2] * dt;
      if (pos[j + 1] < 0) {
        pos[j + 1] = 0;
        vel[j + 1] *= -0.3;
        vel[j] *= 0.5;
        vel[j + 2] *= 0.5;
      }
      const k = Math.max(0, life[i] / this.maxLife[i]);
      col[j] = 1.6 * k;
      col[j + 1] = (0.35 + 0.6 * k) * k;
      col[j + 2] = 0.12 * k * k;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.light.intensity = Math.max(0, this.light.intensity * Math.exp(-dt * 7)) * (0.85 + Math.random() * 0.3);
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.map?.dispose();
    this.points.material.dispose();
    this.light.dispose();
  }
}
