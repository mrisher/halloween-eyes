import * as THREE from "https://cdn.skypack.dev/three@0.133.1/build/three.module";
import { GUI } from "https://cdn.skypack.dev/lil-gui@0.16.1";

const container = document.querySelector(".container");

let config = {
	zoomLevel: 600,
	zoomLevelBounds: [300, 1000],
	shrink: 0,
	fstBaseColor: "#03565c",
	scdBaseColor: "#42cf44",
	midColor: "#f2aa00",
	vignette: 0.65,
	brightness: 0.6,
	darkness: 0.5,
	catEye: false
};

class Controls {
	constructor() {
		this.gui = new GUI();
		this.shrinkContol = this.gui
			.add(viz.eyeShaderMaterial.uniforms.u_shrink, "value", -0.9, 0.3, 0.05)
			.name("shrink");
		this.gui
			.addColor({ color: config.fstBaseColor }, "color")
			.onChange((v) => {
				this.setColor(viz.eyeShaderMaterial.uniforms.u_base_color_1, v);
			})
			.name("base color #1");
		this.gui
			.addColor({ color: config.scdBaseColor }, "color")
			.onChange((v) => {
				this.setColor(viz.eyeShaderMaterial.uniforms.u_base_color_2, v);
			})
			.name("base color #2");
		this.gui
			.addColor({ color: config.midColor }, "color")
			.onChange((v) => {
				this.setColor(viz.eyeShaderMaterial.uniforms.u_mid_color, v);
			})
			.name("middle color");
		this.gui
			.add(viz.eyeShaderMaterial.uniforms.u_vignette, "value", 0, 1, 0.05)
			.name("vignette");
		this.gui
			.add(viz.eyeShaderMaterial.uniforms.u_brightness, "value", 0.2, 0.65, 0.05)
			.name("brightness");
		this.gui
			.add(viz.eyeShaderMaterial.uniforms.u_darkness, "value", 0, 1, 0.05)
			.name("darkness");
	}

	setColor(element, v) {
		element.value = new THREE.Color(v);
	}
}

function randomTween(element) {
	TweenLite.to(element, Math.random() * 3, {
		x: Math.random() * 200,
		y: Math.random() * 200,
		ease: Linear.easeNone,
		onComplete: randomTween,
		onCompleteParams: [element]
	});
}

class Animations {
	constructor() {
		this.playShrink = gsap
			.timeline({
				paused: true,
				onUpdate: () => {
					controls.shrinkContol.setValue(
						viz.eyeShaderMaterial.uniforms.u_shrink.value
					);
				}
			})
			.timeScale(2)
			.to(viz.eyeShaderMaterial.uniforms.u_shrink, {
				duration: 0.5,
				value: -0.9,
				ease: "power2.out"
			})
			.to(viz.eyeShaderMaterial.uniforms.u_shrink, {
				duration: 3,
				value: 0,
				ease: "power2.inOut"
			});

		this.blink = gsap
			.timeline({
				paused: true,
				repeat: 1,
				repeatDelay: 3,
				onComplete: () => {
					animations.blink.repeatDelay(gsap.utils.random(0.1, 3, 0.1)).play(0);
				},
				yoyo: true
			})
			.to(
				viz.upperLidGroup.rotation,
				{
					duration: 0.5,
					x: Math.PI * 0.3,
					ease: "power3.in"
				},
				0
			)
			.to(
				viz.upperLidGroup.rotation,
				{
					duration: 0.5,
					x: 0,
					ease: "power3.in"
				},
				0
			)
			.to(
				viz.lowerLidGroup.rotation,
				{
					duration: 0.5,
					x: Math.PI * -0.3,
					ease: "power3.in"
				},
				0
			)
			.to(
				viz.lowerLidGroup.rotation,
				{
					duration: 0.5,
					x: 0,
					ease: "power3.in"
				},
				0
			);
	}
}

class Viz {
	constructor() {
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		container.appendChild(this.renderer.domElement);
		this.scene = new THREE.Scene();
		this.rightEyeGroup = new THREE.Group();
		this.leftEyeGroup = new THREE.Group();
		this.eyeRadius = 30;
		this.interpupilDistance = 96;
		this.camera = new THREE.PerspectiveCamera(
			20,
			window.innerWidth / window.innerHeight,
			1,
			10000
		);
		// center camera between eyes
		this.camera.position.x += this.interpupilDistance / 2;

		this.mouse = new THREE.Vector2(0, 0);
		this.setupScene();
		this.createEyeball();
		this.createEyelids();
		this.demonTime = new Date(new Date().getTime() + 10000); // Add 10 seconds to the current time
		this.render();
	}

	setupScene() {
		this.scene.background = new THREE.Color(0xffffff);
		this.setCameraPosition(config.zoomLevel);

		const ambientLight = new THREE.AmbientLight(0x999999, 0.7);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(-1, 1, 1);
		this.scene.add(directionalLight);

		// create backdrop
		// Create a plane geometry.
		const planeGeometry = new THREE.PlaneGeometry(1000, 1000);

		// Create a material with a black color.
		const material = new THREE.MeshBasicMaterial({ color: 0x000000 });

		// Create a mesh from the plane geometry and the material.
		const mesh = new THREE.Mesh(planeGeometry, material);

		// Add the black backdrop to the scene.
		this.scene.add(mesh);

		// Position the mesh behind the objects in your scene.
		mesh.position.z = -10;
	}

	setCameraOffsetY() {
		this.camera.position.y = window.innerWidth > 800 ? 0 : 25;
	}

	setCameraPosition(cp) {
		this.camera.position.z = cp;
		this.setCameraOffsetY();
		config.zoomLevel = cp;
	}

	createEyeball() {
		const eyeBallTexture = new THREE.TextureLoader().load(
			"https://assets.codepen.io/959327/eyeball.jpg"
		);
		const eyeAddonGeometry = new THREE.SphereGeometry(this.eyeRadius, 32, 32);
		const eyeAddonMaterial = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			emissive: 0x220000,
			opacity: 0.35,
			shininess: 100,
			transparent: true,
			map: eyeBallTexture
		});
		const eyeAddon = new THREE.Mesh(eyeAddonGeometry, eyeAddonMaterial);
		this.rightEyeGroup.add(eyeAddon);

		const eyeGeometry = new THREE.SphereGeometry(this.eyeRadius - 0.1, 32, 32);
		this.eyeShaderMaterial = new THREE.ShaderMaterial({
			uniforms: {
				u_shrink: { type: "f", value: config.shrink },
				u_base_color_1: {
					type: "v3",
					value: new THREE.Color(config.fstBaseColor)
				},
				u_base_color_2: {
					type: "v3",
					value: new THREE.Color(config.scdBaseColor)
				},
				u_mid_color: {
					type: "v3",
					value: new THREE.Color(config.midColor)
				},
				u_vignette: { type: "f", value: config.vignette },
				u_brightness: { type: "f", value: config.brightness },
				u_darkness: { type: "f", value: config.darkness },
				u_catEye: { type: "bool", value: false }
			},
			vertexShader: document.getElementById("vertexShader").textContent,
			fragmentShader: document.getElementById("fragmentShader").textContent
		});
		const rightEye = new THREE.Mesh(eyeGeometry, this.eyeShaderMaterial);
		rightEye.rotation.y = -Math.PI / 2;
		this.rightEyeGroup.add(rightEye);
		const leftEye = rightEye.clone();
		const leftAddon = eyeAddon.clone();
		this.leftEyeGroup.add(leftAddon);
		this.leftEyeGroup.add(leftEye);

		this.scene.add(this.rightEyeGroup);
		this.leftEyeGroup.position.x += this.interpupilDistance;
		this.scene.add(this.leftEyeGroup);
	}

	createEyelids() {
		// Create a plane geometry for the eyelid.
		const eyelidGeometry = new THREE.PlaneGeometry(
			this.interpupilDistance * 2,
			96
		);

		// Create the hollow hemisphere
		const radius = 34;
		const widthSegments = 32;
		const heightSegments = 32;
		const phiStart = 0;
		const phiLength = Math.PI * 2;
		const thetaStart = 0;
		const thetaLength = Math.PI / 2; // Only half the sphere for a hemisphere

		const geometry = new THREE.SphereBufferGeometry(
			radius,
			widthSegments,
			heightSegments,
			phiStart,
			phiLength,
			thetaStart,
			thetaLength
		);
		const material = new THREE.MeshBasicMaterial({
			color: 0x00ff00,
			wireframe: false
		});
		this.rightUpperEyelid = new THREE.Mesh(geometry, material);
		this.leftUpperEyelid = this.rightUpperEyelid.clone();
		this.leftUpperEyelid.position.x += this.interpupilDistance;

		this.scene.add(this.rightUpperEyelid);
		this.scene.add(this.leftUpperEyelid);
		this.rightUpperEyelid.rotation.x = Math.PI * -0.25;
		this.leftUpperEyelid.rotation.x = Math.PI * -0.25;

		// Create a material for the eyelid.
		const eyelidMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

		// Create a mesh from the plane geometry and the material.
		const eyelidMesh = new THREE.Mesh(eyelidGeometry, eyelidMaterial);

		// Create two rotation groups, one for each side of the eyelid.
		this.upperLidGroup = new THREE.Group();
		this.lowerLidGroup = new THREE.Group();

		eyelidMesh.rotation.x = Math.PI * -0.45;

		// Add the eyelid mesh to the rotation groups.
		this.upperLidGroup.add(eyelidMesh);

		// Position the mesh in front of the eye.
		this.upperLidGroup.position.z = this.eyeRadius;
		this.upperLidGroup.position.y = this.eyeRadius * 1.25;
		this.upperLidGroup.position.x = this.interpupilDistance / 2;

		const lowerEyelidMesh = eyelidMesh.clone();
		lowerEyelidMesh.rotation.x = Math.PI * -1.55;
		this.lowerLidGroup.add(lowerEyelidMesh);
		this.lowerLidGroup.position.z = this.eyeRadius;
		this.lowerLidGroup.position.y = this.eyeRadius * -1.1;
		this.lowerLidGroup.position.x = this.interpupilDistance / 2;

		// Add the mesh to the scene.
		this.scene.add(this.upperLidGroup);
		this.scene.add(this.lowerLidGroup);

		// Rotate the rotation groups in opposite directions to create the shutter animation.
		this.upperLidGroup.rotation.x = Math.PI * 0;
		this.lowerLidGroup.rotation.x = Math.PI * -0;
	}

	addCanvasEvents() {
		container.addEventListener("wheel", (e) => {
			config.zoomLevel += 0.1 * e.deltaY;
			config.zoomLevel = Math.min(config.zoomLevel, config.zoomLevelBounds[1]);
			config.zoomLevel = Math.max(config.zoomLevel, config.zoomLevelBounds[0]);
			viz.setCameraPosition(config.zoomLevel);
		});
		container.querySelector("canvas").addEventListener("click", () => {
			animations.playShrink.play(0);
		});
		container.addEventListener("touchmove", (e) => {
			updateMousePosition(e.touches[0].pageX, e.touches[0].pageY, this);
		});
		function updateMousePosition(eX, eY, viz) {
			viz.mouse = {
				x: (eX - viz.windowHalf.x) / viz.windowHalf.x,
				y: (eY - viz.windowHalf.y) / viz.windowHalf.y
			};
		}
	}

	render() {
		this.renderer.render(this.scene, this.camera);
	}

	loop() {
		this.render();
		requestAnimationFrame(this.loop.bind(this));
	}

	updateSize() {
		this.windowHalf = {
			x: window.innerWidth / 2,
			y: window.innerHeight / 2
		};
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.setCameraOffsetY();
	}
}

function lookRandom() {
	const lookAtX = gsap.utils.random(-0.5, 0.5);
	const lookAtY = gsap.utils.random(-1, 1);
	const pupilScale = gsap.utils.random(-0.5, 0.3, 0.1);

	const timeline = gsap
		.timeline({
			paused: true,
			delay: gsap.utils.random(0.5, 1, 0.2),
			onComplete: () => {
				if (new Date() < viz.demonTime) lookRandom();
				else {
					controls.setColor(
						viz.eyeShaderMaterial.uniforms.u_base_color_1,
						"#3e035e"
					);
					controls.setColor(
						viz.eyeShaderMaterial.uniforms.u_base_color_2,
						"#a71616"
					);
					//controls.setColor(viz.eyeShaderMaterial.uniforms.u_mid_color, "#f00074");
					viz.eyeShaderMaterial.uniforms.u_catEye.value = true;
					lookRandom();
				}
			}
		})
		.to(
			viz.rightEyeGroup.rotation,
			{
				x: lookAtX,
				y: lookAtY,
				duration: 0.5
			},
			0
		)
		.to(
			viz.leftEyeGroup.rotation,
			{
				x: lookAtX,
				y: lookAtY,
				duration: 0.5
			},
			0
		)
		.to(viz.eyeShaderMaterial.uniforms.u_shrink, {
			duration: 0.5,
			value: pupilScale,
			ease: "power2.out"
		});
	timeline.restart(true);
}

const viz = new Viz();
const controls = new Controls();
controls.gui.close();
const animations = new Animations();

viz.updateSize();
viz.addCanvasEvents();

window.addEventListener("resize", () => viz.updateSize());
viz.loop();
animations.blink.delay(3);
animations.blink.play(0);
lookRandom();
