import * as THREE from 'three';

export class PointsParticleSystem {
  constructor(
    material, // マテリアル
    capacity, // パーティクルの最大数
    {
      birthRate = 100, // 1秒あたりに生成するパーティクル数
      lifeExpectancy = 1.0, // パーティクルの寿命(秒)
      lifeVariance = 0.0, // パーティクルの寿命の分散 [0, 1]
      useColor = false, // パーティクルごとに色を設定するか
    } = {})
{
    this._capacity = capacity;
    this.birthRate = birthRate;
    this.lifeExpectancy = lifeExpectancy;
    this.lifeVariance = lifeVariance;
    this._useColor = useColor;

    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * capacity), 3));
    this._geometry.setAttribute('pScale', new THREE.Float32BufferAttribute(new Float32Array(capacity), 1));
    if (useColor) {
      this._geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(3 * capacity), 3));
    }
    this.points = new THREE.Points(this._geometry, material);

    // パーティクルの状態を管理する配列
    this._ages = new Array(this._capacity);
    this._lifes = new Array(this._capacity);
    this._alives = new Array(this._capacity);
    this._positions = new Array(this._capacity);
    this._scales = new Array(this._capacity);
    this._colors = useColor ? new Array(this._capacity) : null;
    for (let i = 0; i < this._capacity; ++i) {
      this._ages[i] = 0.0;
      this._lifes[i] = 0.0;
      this._alives[i] = false;
      this._positions[i] = new THREE.Vector3();
      this._scales[i] = 0.0;
      if (useColor) {
        this._colors[i] = new THREE.Color();
      }
    }
  }

  get capacity() {
    return this._capacity;
  }

  get useColor() {
    return this._useColor;
  }

  update(deltaSeconds) {
    let aliveCount = 0;
    let birthNum = this.birthRate * deltaSeconds;

    const output = {
      position: new THREE.Vector3(),
      scale: 0.0,
      color: this._useColor ? new THREE.Color() : null,
    };

    for (let i = 0; i < this._capacity; ++i) {
      if (this._alives[i]) {
        const age = this._ages[i];
        const life = this._lifes[i];
        const currentAge = age + deltaSeconds;
        if (currentAge <= life) {
          // まだ寿命に達してないパーティクルは更新する
          this._ages[i] = currentAge;

          this.updateParticle(output, {
            index: i,
            age: currentAge,
            life: life,
            position: this._positions[i],
            scale: this._scales[i],
            color: this._useColor ? this._colors[i] : null,
            useColor: this._useColor,
            deltaSeconds: deltaSeconds,
          });

          this._copyOutput(i, aliveCount, output);
          aliveCount += 1;
        } else {
          // 寿命に達したパーティクルは廃棄する
          this._alives[i] = false;
        }
      } else if (birthNum >= 1.0 || (birthNum > 0 && Math.random() <= birthNum)) {
        // このフレームで十分に新規パーティクルを生成していない場合はパーティクルを生成する
        birthNum -= 1.0;

        this._alives[i] = true;
        this._ages[i] = 0.0;
        this._lifes[i] = this.lifeExpectancy * (1.0 + (Math.random() * 2.0 - 1.0) * this.lifeVariance);

        this.createParticle(output, {
          index: i,
          useColor: this._useColor,
        });

        this._copyOutput(i, aliveCount, output);
        aliveCount += 1;
      }
    }

    // Pointsの配列を更新する
    this._geometry.setDrawRange(0, aliveCount);
    this._geometry.attributes.position.needsUpdate = true;
    this._geometry.attributes.pScale.needsUpdate = true;
    if (this._useColor) {
      this._geometry.attributes.color.needsUpdate = true;
    }
  }

  _copyOutput(index, aliveCount, output) {
    this._positions[index].copy(output.position);
    this._scales[index] = output.scale;
    this._geometry.attributes.position.array[aliveCount * 3] = output.position.x;
    this._geometry.attributes.position.array[aliveCount * 3 + 1] = output.position.y;
    this._geometry.attributes.position.array[aliveCount * 3 + 2] = output.position.z;
    this._geometry.attributes.pScale.array[aliveCount] = output.scale;
    if (this._useColor) {
      this._colors[index].copy(output.color);
      this._geometry.attributes.color.array[aliveCount * 3] = output.color.r;
      this._geometry.attributes.color.array[aliveCount * 3 + 1] = output.color.g;
      this._geometry.attributes.color.array[aliveCount * 3 + 2] = output.color.b;  
    }
  }

  // パーティクルの初期化はサブクラスで実装する
  createParticle(output, parameters) {
    console.error('This method must be implemented in subclass.');
  }

  // パーティクルの更新はサブクラスで実装する
  updateParticle(output, parameters) {
    console.error('This method must be implemented in subclass.');
  }
}

export class GridPointsParticleSystem extends PointsParticleSystem {
  constructor(material, capacity, options) {
    super(material, capacity, options);
    this._idCount = 0;

    this._gridSize = 40;
    this._gridSizeHalf = 0.5 * this._gridSize;
    this._gridDivision = 20;
    this._gridDivision2 = this._gridDivision * this._gridDivision;
    this._gridSpacing = this._gridSize / this._gridDivision;

    this._velocities = new Array(capacity);
    for (let i = 0; i < capacity; ++i) {
      this._velocities[i] = new THREE.Vector3();
    }

    this._velocity = new THREE.Vector3();
  }

  createParticle(output, parameters) {
    const id = this._idCount++;

    const x = id % this._gridDivision;
    const y = Math.floor(id / this._gridDivision2 % this._gridDivision);
    const z = Math.floor(id % this._gridDivision2 / this._gridDivision);

    output.position.set(
      x * this._gridSpacing - this._gridSizeHalf,
      y * this._gridSpacing - this._gridSizeHalf,
      z * this._gridSpacing - this._gridSizeHalf,
    );
    output.scale = 0.0;
    if (this.useColor) {
      output.color.setRGB(x / (this._gridSize - 1), y / (this._gridSize - 1), z / (this._gridSize - 1));
    }

    this._velocities[parameters.index].copy(randomInSphere());
  }

  updateParticle(output, parameters) {
    this._velocity.copy(this._velocities[parameters.index]);
    this._velocity.multiplyScalar(2.0 * parameters.deltaSeconds);
    output.position.copy(parameters.position);
    output.position.add(this._velocity);
    output.scale = Math.sin(Math.PI * parameters.age / parameters.life);
    if (this.useColor) {
      output.color.copy(parameters.color);
    }
  }
}

export class ParticlePointsMaterial extends THREE.PointsMaterial {
  constructor(options) {
    super(options);
    this.onBeforeCompile = this._onBeforeCompile;
  }

  _onBeforeCompile(shader) {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <color_pars_vertex>',
      `
      #include <color_pars_vertex>
      attribute float pScale;
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      'gl_PointSize = size;',
      `
      gl_PointSize = size * pScale;
      `
    );
  }
}

function randomInSphere() {
  const cosTheta = -2.0 * Math.random() + 1.0;
  const sinTheta = Math.sqrt(1.0 - cosTheta * cosTheta);
  const phi = 2.0 * Math.PI * Math.random();
  const radius = Math.pow(Math.random(), 1.0 / 3.0);
  return new THREE.Vector3(radius * sinTheta * Math.cos(phi), radius * sinTheta * Math.sin(phi), radius * cosTheta);
}
