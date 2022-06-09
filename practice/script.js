// モジュールの読み込み
import * as THREE from "../lib/three.module.js";
import {OrbitControls} from "../lib/OrbitControls.js";

window.addEventListener("DOMContentLoaded", () => {
	const app = new App3();
	app.init();
	app.render();

}, false);

class App3 {

	static get CAMERA_PARAM() {
		return {
			fovy: 60,
			aspect: window.innerWidth / window.innerHeight,
			near: 0.1,
			far: 20.0,
			x: 7.0,
			y: 5.5,
			z: 30.0,
			lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
		};
	}

	static get RENDERER_PARAM() {
		return {
			clearColor: 0x777777,
			width: window.innerWidth,
			height: window.innerHeight,
		};
	}

	static get MATERIAL_PARAM() {
		return {
			color: 0x333333,
			side: THREE.DoubleSide,
		};
	}

	static get MATERIAL_PARAM_POWERSWITCH() {
		return {
			color: 0x0000FF
		};
	}

	static get MATERIAL_PARAM_SWINGSWITCH() {
		return {
			color: 0xFF0000
		};
	}

	static get MATERIAL_PARAM_STOPSWITCH() {
		return {
			color: 0xFFFF00
		};
	}

	static get DIRECTIONAL_LIGHT_PARAM() {
		return {
			color: 0xffffff,
			intensity: 1.0,
			x: 1.0,
			y: 1.0,
			z: 1.0
		};
	}

	static get AMBIENT_LIGHT_PARAM() {
		return {
			color: 0xffffff,
			intensity: 0.2,
		};
	}

	constructor() {
		this.renderer;
		this.scene;
		this.camera;
		this.directionalLight;
		this.ambientLight;
		this.controls;
		this.axesHelper;
		this.material;
		this.powerSwitchMaterial;
		this.swingSwitchMaterial;
		this.stopSwitchMaterial;
		this.stopSwitch;
		this.fanArray;
		this.fanFace = Math.PI / 4;	// 最初の羽の角度
		this.fanPower = 0.1;		// 羽の回転速度
		this.swingGroup;			// 首振りグループ
		this.moter;					// モーター
		this.pole;					// 支柱
		this.base;					// 土台
		this.swingDirection = 1;	// 首振り方向
		this.swingRange = Math.PI / 4;	// 首振りの角度（+-45度）
		this.swingSwich = 3;		// 首振り切替秒
		this.startTime;

		this.mouse;		// マウス座標管理
		this.raycaster;	// レイキャスター
		this.switchDown = 0.03;	// スイッチの凹み具合
		
		this.powerSwitchArray;	// 強弱スイッチの配列
		this.currPowerSwitch = "powerSwitch1";	// 現在押下されている強弱スイッチ
		this.psFlg1 = false;
		this.psFlg2 = false;
		this.psFlg3 = false;

		this.swingSwitchArray;	// 首振りスイッチの配列
		this.currSwingSwitch = "swingSwitch1";	// 現在押下されている首振りスイッチ
		this.ssFlg1 = false;
		this.ssFlg2 = false;

		this.stsFlg = false;
		this.stopSwing = false;	// 首振り停止フラグ

		this.isDown = false;

		this.render = this.render.bind(this);

		window.addEventListener("keydown", e => {
			switch (e.key) {
				case " ":
					this.isDown = true;
					break;
				default:
			}
		}, false);

		window.addEventListener("keyup", e => {
			this.isDown = false;
		}, false);

		window.addEventListener("resize", () => {
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
		}, false);
	}

	init() {
		this.startTime = Date.now();

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setClearColor(new THREE.Color(App3.RENDERER_PARAM.clearColor));
		this.renderer.setSize(App3.RENDERER_PARAM.width, App3.RENDERER_PARAM.height);
		const wrapper = document.querySelector("#webgl");
		wrapper.appendChild(this.renderer.domElement);

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera(
			App3.CAMERA_PARAM.fovy,
			App3.CAMERA_PARAM.aspect,
			App3.CAMERA_PARAM.near,
			App3.CAMERA_PARAM.far
		);
		this.camera.position.set(
			App3.CAMERA_PARAM.x,
			App3.CAMERA_PARAM.y,
			App3.CAMERA_PARAM.z
		);
		this.camera.lookAt(App3.CAMERA_PARAM.lookAt);

		this.directionalLight = new THREE.DirectionalLight(
			App3.DIRECTIONAL_LIGHT_PARAM.color,
			App3.DIRECTIONAL_LIGHT_PARAM.intensity
		);
		this.directionalLight.position.set(
			App3.DIRECTIONAL_LIGHT_PARAM.x,
			App3.DIRECTIONAL_LIGHT_PARAM.y,
			App3.DIRECTIONAL_LIGHT_PARAM.z
		);
		this.scene.add(this.directionalLight);

		this.ambientLight = new THREE.AmbientLight(
			App3.AMBIENT_LIGHT_PARAM.color,
			App3.AMBIENT_LIGHT_PARAM.intensity,
		);
		this.scene.add(this.ambientLight);

		this.material = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM);
		this.powerSwitchMaterial = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM_POWERSWITCH);
		this.swingSwitchMaterial = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM_SWINGSWITCH);
		this.stopSwitchMaterial = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM_STOPSWITCH);

		this.swingGroup = new THREE.Group();
		this.scene.add(this.swingGroup);

		// 羽
		const FAN_COUNT = 4;
		this.fanArray = [];
		for (let i = 0; i < FAN_COUNT; ++i) {
			const fanGeometry = new THREE.CircleGeometry(1.2, 8, Math.PI / 2 * i, Math.PI / 4);
			const fan = new THREE.Mesh(fanGeometry, this.material);
			fan.position.x = 0.5;
			fan.position.y = 3;
			fan.position.z = 0.5;
			fan.rotation.y = this.fanFace;
			fan.name = `fan${i + 1}`;
			this.fanArray.push(fan);
			this.swingGroup.add(fan);
		}

		// モーター
		const motorGeometry = new THREE.CapsuleGeometry(0.25, 0.5, 4, 16);
		this.motor = new THREE.Mesh(motorGeometry, this.material);
		this.motor.position.x = 0.2;
		this.motor.position.y = 3;
		this.motor.position.z = 0.2;
		this.motor.rotation.x = Math.PI / 2;
		this.motor.rotation.z = -Math.PI / 4;
		this.motor.name = "motor";
		this.swingGroup.add(this.motor);

		// 支柱
		const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 32);
		this.pole = new THREE.Mesh(poleGeometry, this.material);
		this.pole.position.y = 1.5;
		this.pole.name = "pole";
		this.swingGroup.add(this.pole);
		
		// 土台
		const baseGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
		this.base = new THREE.Mesh(baseGeometry, this.material);
		this.base.name = "base";
		this.scene.add(this.base);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		// 首振り停止スイッチ
		const stopSwitchGeometry = new THREE.CapsuleGeometry(0.05, 0.1, 4, 16);
		this.stopSwitch = new THREE.Mesh(stopSwitchGeometry, this.stopSwitchMaterial);
		this.stopSwitch.position.y = 3.2;
		this.stopSwitch.name = "stopSwitch";
		this.swingGroup.add(this.stopSwitch);

		// 羽の強弱スイッチ
		const POWERSWITCH_COUNT = 3;
		this.powerSwitchArray = [];
		for (let i = 0; i < POWERSWITCH_COUNT; ++i) {
			const powerSwitchGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
			const powerSwitch = new THREE.Mesh(powerSwitchGeometry, this.powerSwitchMaterial);
			powerSwitch.position.set(0.25 * i, 0.1, 0.25 * (2 - i));
			if (i === 0) powerSwitch.position.y = this.switchDown;	// 最初は弱スイッチを凹ませておく
			powerSwitch.rotation.y = this.fanFace;
			powerSwitch.name = `powerSwitch${i + 1}`;
			this.powerSwitchArray.push(powerSwitch);
			this.scene.add(powerSwitch);
		}

		// 首振りの範囲スイッチ
		const SWINGSWITCH_COUNT = 2;
		this.swingSwitchArray = [];
		for (let i = 0; i < SWINGSWITCH_COUNT; ++i) {
			const swingSwitchGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
			const swingSwitch = new THREE.Mesh(swingSwitchGeometry, this.swingSwitchMaterial);
			if (i === 0) swingSwitch.position.set(0.38, 0.1, 0.62);
			if (i === 1) swingSwitch.position.set(0.62, 0.1, 0.38);
			if (i === 0) swingSwitch.position.y = this.switchDown;	// 最初は弱スイッチを凹ませておく
			swingSwitch.rotation.y = this.fanFace;
			swingSwitch.name = `swingSwitch${i + 1}`;
			this.swingSwitchArray.push(swingSwitch);
			this.scene.add(swingSwitch);
		}

		const axesBarLength = 5.0;
		this.axesHelper = new THREE.AxesHelper(axesBarLength);
		this.scene.add(this.axesHelper);

		// マウス監視
		this.mouse = new THREE.Vector2();
		this.renderer.domElement.addEventListener("mousemove", this.handleMouseMove.bind(this));

		// クリックイベント
		this.renderer.domElement.addEventListener("click", this.handleClick.bind(this));

		// レイキャスト作成
		this.raycaster = new THREE.Raycaster();
	}

	// マウスムーブのハンドラ
	handleMouseMove(event) {
		const element = event.currentTarget;
		// canvas 要素上の XY 座標
		const x = event.clientX - element.offsetLeft;
		const y = event.clientY - element.offsetTop;
		// canvas 要素の幅・高さ
		const w = element.offsetWidth;
		const h = element.offsetHeight;
		// -1 ~ +1 の範囲でマウス座用を登録
		this.mouse.x = (x / w) * 2 - 1;
		this.mouse.y = - (y / h) * 2 + 1;
	}

	// クリックイベントのハンドラ
	handleClick(event) {
		if (this.psFlg1 || this.psFlg2 || this.psFlg3) {
			this.powerSwitchArray.forEach(ps => {
				ps.position.y = 0.1;
			});
		}
		if (this.psFlg1) {
			this.currPowerSwitch = "powerSwitch1";
			this.powerSwitchArray[0].position.y = this.switchDown;
		}
		if (this.psFlg2) {
			this.currPowerSwitch = "powerSwitch2";
			this.powerSwitchArray[1].position.y = this.switchDown;
		}
		if (this.psFlg3) {
			this.currPowerSwitch = "powerSwitch3";
			this.powerSwitchArray[2].position.y = this.switchDown;
		}

		if (this.ssFlg1 || this.ssFlg2) {
			this.swingSwitchArray.forEach(ss => {
				ss.position.y = 0.1;
			});
		}
		if (this.ssFlg1) {
			this.currSwingSwitch = "swingSwitch1";
			this.swingSwitchArray[0].position.y = this.switchDown;
		}
		if (this.ssFlg2) {
			this.currSwingSwitch = "swingSwitch2";
			this.swingSwitchArray[1].position.y = this.switchDown;
		}

		if (this.stsFlg) {
			this.stopSwing = !this.stopSwing;
			this.stopSwitch.position.y = this.stopSwing ? 3.26 : 3.2;
		}
	}

	downFlgs() {
		this.psFlg1 = false;
		this.psFlg2 = false;
		this.psFlg3 = false;
		this.ssFlg1 = false;
		this.ssFlg2 = false;
		this.stsFlg = false;
	}

	render() {
		requestAnimationFrame(this.render);
		this.controls.update();

		let pastTime = (Date.now() - this.startTime) / 1000;

		// レイキャスト生成
		this.raycaster.setFromCamera(this.mouse, this.camera);
		const intersects = this.raycaster.intersectObjects(this.scene.children);
		
		// マウスオーバーフラグ
		this.downFlgs();
		if (intersects.length) {

			switch (intersects[0].object.name) {
				case "powerSwitch1":
					this.psFlg1 = true;
					break;
				case "powerSwitch2":
					this.psFlg2 = true;
					break;
				case "powerSwitch3":
					this.psFlg3 = true;
					break;
				case "swingSwitch1":
					this.ssFlg1 = true;
					break;
				case "swingSwitch2":
					this.ssFlg2 = true;
					break;
				case "stopSwitch":
					this.stsFlg = true;
					break;
				default:
			}
		}

		// 首振り範囲の切替
		if (this.currSwingSwitch === "swingSwitch1") {
			this.swingRange = Math.PI / 4;
		} else if (this.currSwingSwitch === "swingSwitch2") {
			this.swingRange = Math.PI / 2;
		}

		// 首振り方向切替
		if (this.swingGroup.rotation.y < (-1 * this.swingRange)) {
			this.swingDirection = 1;
		} else if (this.swingGroup.rotation.y > this.swingRange) {
			this.swingDirection = -1;
		}

		// 首振りの回転
		if (!this.stopSwing) {
			this.swingGroup.rotation.y += (this.swingDirection * 0.01);
		}

		// 羽の回転
		this.fanArray.forEach(fan => {
			switch (this.currPowerSwitch) {
				case "powerSwitch1":
					fan.rotation.z += this.fanPower;
				break;
				case "powerSwitch2":
					fan.rotation.z += this.fanPower * 2.0;
				break;
				case "powerSwitch3":
					fan.rotation.z += this.fanPower * 3.0;
				break;
			}
		});

		this.renderer.render(this.scene, this.camera);
	}
}