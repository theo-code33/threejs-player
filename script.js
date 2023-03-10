// Create noise
const noise = new SimplexNoise();

// Fractionate a value between a range
function fractionate(val, minVal, maxVal) {
  return (val - minVal) / (maxVal - minVal);
}

// Modulate a value between a range
function modulate(val, minVal, maxVal, outMin, outMax) {
  const fr = fractionate(val, minVal, maxVal);
  const delta = outMax - outMin;
  return outMin + fr * delta;
}

// Average of an array
function avg(arr) {
  const total = arr.reduce(function (sum, b) {
    return sum + b;
  });
  return total / arr.length;
}

// Max value of an array
function max(arr) {
  return arr.reduce(function (a, b) {
    return Math.max(a, b);
  });
}

// Init Sphere
const initSphere = function () {
  // get audio html element
  const file = document.querySelector("#thefile");
  const audio = document.querySelector("#audio");
  const fileLabel = document.querySelector("label.file");

  // start audio on load
  document.onload = () => {
    audio.play();
    play();
  };

  // start audio on file change
  file.onchange = function () {
    fileLabel.classList.add("normal");
    audio.classList.add("active");
    const files = this.files;

    audio.src = URL.createObjectURL(files[0]);
    audio.load();
    audio.play();
    play();
  };

  // Play audio, create sphere and create scene
  function play() {
    const context = new AudioContext();
    const src = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    src.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(scene.position);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const icosahedronGeometry = new THREE.IcosahedronGeometry(10, 4);
    const lambertMaterial = new THREE.MeshLambertMaterial({
      wireframe: true,
    });

    let snowflakes = [];
    for (let i = 0; i < 1000; i++) {
      let geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      let material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      setInterval(() => {
        material.color.setHex(Math.random() * 0xffffff);
        geometry.vertices[0].y = Math.random() * 5;
      }, 10);
      let snowflake = new THREE.Mesh(geometry, material);
      snowflake.position.x = Math.random() * 300 - 45;
      snowflake.position.y = Math.random() * 300 - 45;
      snowflake.position.z = Math.random() * 300 - 45;
      snowflakes.push(snowflake);
      scene.add(snowflake);
    }

    const ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    ball.position.set(0, 0, 0);
    group.add(ball);

    const ambientLight = new THREE.AmbientLight(0xaaaaaa);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.intensity = 0.9;
    spotLight.position.set(-10, 40, 20);
    spotLight.lookAt(ball);
    spotLight.castShadow = true;
    scene.add(spotLight);

    scene.add(group);

    document.querySelector("#blob").appendChild(renderer.domElement);

    window.addEventListener("resize", onWindowResize, false);

    render();

    // Render Sphere
    function render() {
      analyser.getByteFrequencyData(dataArray);

      const lowerHalfArray = dataArray.slice(0, dataArray.length / 2 - 1);
      const upperHalfArray = dataArray.slice(
        dataArray.length / 2 - 1,
        dataArray.length - 1
      );

      const lowerMax = max(lowerHalfArray);
      const upperAvg = avg(upperHalfArray);

      const lowerMaxFr = lowerMax / lowerHalfArray.length;
      const upperAvgFr = upperAvg / upperHalfArray.length;

      makeRoughBall(
        ball,
        modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8),
        modulate(upperAvgFr, 0, 1, 0, 4)
      );

      group.rotation.y += 0.005;
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Create sphere
    function makeRoughBall(mesh, bassFr, treFr) {
      mesh.geometry.vertices.forEach(function (vertex, i) {
        const offset = mesh.geometry.parameters.radius;
        const amp = 7;
        const time = window.performance.now();
        vertex.normalize();
        const rf = 0.00001;
        const distance =
          offset +
          bassFr +
          noise.noise3D(
            vertex.x + time * rf * 7,
            vertex.y + time * rf * 8,
            vertex.z + time * rf * 9
          ) *
            amp *
            treFr;
        vertex.multiplyScalar(distance);
      });
      mesh.geometry.verticesNeedUpdate = true;
      mesh.geometry.normalsNeedUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeFaceNormals();

      setInterval(() => {
        const randomColor = `rgb(${Math.floor(
          Math.random() * 256
        )}, ${Math.floor(Math.random() * 256)}, ${Math.floor(
          Math.random() * 256
        )})`;
        mesh.material.color.set(randomColor);
      }, 2000);
    }
    function animate() {
      requestAnimationFrame(animate);
      snowflakes.forEach((snowflake) => {
        if (snowflake.position.y < -10) {
          snowflake.position.y = 10;
        } else {
          snowflake.position.y -= 0.1;
        }
      });
      renderer.render(scene, camera);
    }
    animate();
    audio.play();
  }
};

window.onload = initSphere();

document.body.addEventListener("touchend", () => {
  context.resume();
});
