const EPS = 0.00001;


var mouseInterface = false;
var touchInterface = false;


// create a scene with a better shadow
createScene();


scene.remove(light)
renderer.shadowMap.type = THREE.PCFSoftShadowMap;


// PointLight and DirectionaLight make problems with older GPU
var light = new THREE.SpotLight('white', 0.5);
light.position.set(50, 50, 50);
light.penumbra = 1;
light.shadow.mapSize.width = Math.min(4 * 1024, renderer.capabilities.maxTextureSize / 2);
light.shadow.mapSize.height = light.shadow.mapSize.width;
light.shadow.radius = 2;
light.castShadow = false;
scene.add(light);


var controls = new THREE.OrbitControls(camera, renderer.domElement);
Mannequin.colors = ['white', 'white', 'white', 'white', 'white', 'white'];
//Mannequin.colors = [ 'white', 'white', 'white', 'white', 'white', 'white'];
var model, names;


// create gauge indicator
var gauge = new THREE.Mesh(
	new THREE.CircleBufferGeometry(10, 32, 9 / 4 * Math.PI, Math.PI / 2),
	new THREE.MeshPhongMaterial(
		{
			side: THREE.DoubleSide,
			color: 'red',
			transparent: true,
			opacity: 0.75,
			alphaMap: gaugeTexture()
		})
),
	gaugeMaterial = new THREE.MeshBasicMaterial(
		{
			color: 'red'
		});

gauge.add(new THREE.Mesh(new THREE.TorusBufferGeometry(10, 0.1, 8, 32, Math.PI / 2).rotateZ(Math.PI / 4), gaugeMaterial));
gauge.add(new THREE.Mesh(new THREE.ConeBufferGeometry(0.7, 3, 6).translate(-10, 0, 0).rotateZ(5 * Math.PI / 4), gaugeMaterial));
gauge.add(new THREE.Mesh(new THREE.ConeBufferGeometry(0.7, 3, 6).translate(10, 0, 0).rotateZ(3 * Math.PI / 4), gaugeMaterial));


function gaugeTexture(size = 256) {
	var canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	var r = size / 2;

	var ctx = canvas.getContext('2d');
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, size, size);

	var grd = ctx.createRadialGradient(r, r, r / 2, r, r, r);
	grd.addColorStop(0, "black");
	grd.addColorStop(1, "gray");

	// Fill with gradient
	ctx.fillStyle = grd;
	ctx.fillRect(1, 1, size - 2, size - 2);

	var start = Math.PI,
		end = 2 * Math.PI;

	ctx.strokeStyle = 'white';
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (var rr = r; rr > 0; rr -= 25)
		ctx.arc(size / 2, size / 2, rr, start, end);

	for (var i = 0; i <= 12; i++) {
		ctx.moveTo(r, r);
		var a = start + i / 12 * (end - start);
		ctx.lineTo(r + r * Math.cos(a), r + r * Math.sin(a));
	}
	ctx.stroke();

	var texture = new THREE.CanvasTexture(canvas, THREE.UVMapping);
	texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
	texture.repeat.set(1, 1);

	return texture;
}




var mouse = new THREE.Vector2(), // mouse 3D position
	mouseButton = undefined, // pressed mouse buttons
	raycaster = new THREE.Raycaster(), // raycaster to grab body part
	dragPoint = new THREE.Mesh(), // point of grabbing
	obj = undefined; // currently selected body part


var cbInverseKinematics = document.getElementById('inverse-kinematics'),
	cbBiologicalConstraints = document.getElementById('biological-constraints'),
	cbRotZ = document.getElementById('rot-z'),
	cbRotX = document.getElementById('rot-x'),
	cbRotY = document.getElementById('rot-y'),
	cbMovY = document.getElementById('mov-y');


// set up event handlers
document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);

document.addEventListener('touchstart', onMouseDown);
document.addEventListener('touchend', onMouseUp);
document.addEventListener('touchcancel', onMouseUp);
document.addEventListener('touchmove', onMouseMove);


cbRotZ.addEventListener('click', processCheckBoxes);
cbRotX.addEventListener('click', processCheckBoxes);
cbRotY.addEventListener('click', processCheckBoxes);
cbMovY.addEventListener('click', processCheckBoxes);




controls.addEventListener('start', function() {
	renderer.setAnimationLoop(drawFrame);
});


controls.addEventListener('end', function() {
	renderer.setAnimationLoop(null);
	renderer.render(scene, camera);
});


window.addEventListener('resize', function() {
	renderer.render(scene, camera);
});


function processCheckBoxes(event) {
	if (event) {
		if (event.target.checked) {
			cbRotX.checked = cbRotY.checked = cbRotY.checked = cbRotZ.checked = cbMovY.checked = false;
			event.target.checked = true;
		}

		if (touchInterface) event.target.checked = true;
	}

	if (!obj) return;

	if (cbRotZ.checked) {
		obj.rotation.reorder('XYZ');
	}

	if (cbRotX.checked) {
		obj.rotation.reorder('YZX');
	}

	if (cbRotY.checked) {
		obj.rotation.reorder('ZXY');
	}
}


function onMouseUp(event) {
	controls.enabled = true;
	mouseButton = undefined;
	deselect();
	renderer.setAnimationLoop(null);
	renderer.render(scene, camera);
}


function select(object) {
	deselect();
	obj = object;
	obj?.select(true);
}


function deselect() {
	gauge.parent?.remove(gauge);
	obj?.select(false);
	obj = undefined;
}


function createModel() {
	model = new Male();
	model.name = "humanmodel";
	model.l_tips = model.l_fingers.tips;
	model.r_tips = model.r_fingers.tips;

	names = [
		['body', 'tilt', 'turn', 'bend'],
		['pelvis', 'tilt', 'turn', 'bend'],
		['torso', 'tilt', 'turn', 'bend'],
		['neck', 'tilt', 'turn', 'nod'],
		['head', 'tilt', 'turn', 'nod'],
		['l_leg', 'straddle', 'turn', 'raise'],
		['l_knee', '', '', 'bend'],
		['l_ankle', 'tilt', 'turn', 'bend'],
		['l_arm', 'straddle', 'turn', 'raise'],
		['l_elbow', '', '', 'bend'],
		['l_wrist', 'tilt', 'turn', 'bend'],
		['l_fingers', '', '', 'bend'],
		['l_tips', '', '', 'bend'],
		['r_leg', 'straddle', 'turn', 'raise'],
		['r_knee', '', '', 'bend'],
		['r_ankle', 'tilt', 'turn', 'bend'],
		['r_arm', 'straddle', 'turn', 'raise'],
		['r_elbow', '', '', 'bend'],
		['r_wrist', 'tilt', 'turn', 'bend'],
		['r_fingers', '', '', 'bend'],
		['r_tips', '', '', 'bend']
	];
	for (var nameData of names) {
		var name = nameData[0];
		for (var part of model[name].children[0].children)
			part.name = name;
		for (var part of model[name].children[0].children[0].children)
			part.name = name;
		if (model[name].children[0].children[1])
			for (var part of model[name].children[0].children[1].children)
				part.name = name;
		model[name].nameUI = {
			x: nameData[1],
			y: nameData[2],
			z: nameData[3]
		};
	}
}

function toggleDrawing() {

	var currentpose = model.postureString;
	scene.remove(model);
	isTransparent = !isTransparent;
	createModel();
	setPostureByJson(currentpose);
	renderer.render(scene, camera);
}
createModel();

function onMouseDown(event) {
	userInput(event);

	gauge.parent?.remove(gauge);
	dragPoint.parent?.remove(dragPoint);

	raycaster.setFromCamera(mouse, camera);

	var intersects = raycaster.intersectObject(model, true);

	if (intersects.length && (intersects[0].object.name || intersects[0].object.parent.name)) {
		controls.enabled = false;

		var name = intersects[0].object.name || intersects[0].object.parent.name;

		if (name == 'neck') name = 'head';
		if (name == 'pelvis') name = 'body';

		select(model[name]);

		document.getElementById('rot-x-name').innerHTML = model[name].nameUI.x || 'N/A';
		document.getElementById('rot-y-name').innerHTML = model[name].nameUI.y || 'N/A';
		document.getElementById('rot-z-name').innerHTML = model[name].nameUI.z || 'N/A';

		dragPoint.position.copy(obj.worldToLocal(intersects[0].point));
		obj.imageWrapper.add(dragPoint);

		if (!cbMovY.checked) obj.imageWrapper.add(gauge);
		gauge.position.y = (obj instanceof Ankle) ? 2 : 0;

		processCheckBoxes();
	}
	renderer.setAnimationLoop(drawFrame);
}


function relativeTurn(joint, rotationalAngle, angle) {
	if (!rotationalAngle) {
		// it is translation, not rotation
		joint.position.y += angle;
		return;
	}

	if (joint.biologicallyImpossibleLevel) {
		if (cbBiologicalConstraints.checked) {
			// there is a dedicated function to check biological possibility of joint
			var oldImpossibility = joint.biologicallyImpossibleLevel();

			joint[rotationalAngle] += angle;
			joint.updateMatrix();
			joint.updateWorldMatrix(true); // ! important, otherwise get's stuck

			var newImpossibility = joint.biologicallyImpossibleLevel();

			if (newImpossibility > EPS && newImpossibility >= oldImpossibility - EPS) {
				// undo rotation
				joint[rotationalAngle] -= angle;
				return;
			}
		}
		else {
			joint.biologicallyImpossibleLevel();
			joint[rotationalAngle] += angle;
		}
		// keep the rotation, it is either possible, or improves impossible situation
	}
	else {
		// there is no dedicated function, test with individual rotation range

		var val = joint[rotationalAngle] + angle,
			min = joint.minRot[rotationalAngle],
			max = joint.maxRot[rotationalAngle];

		if (cbBiologicalConstraints.checked || min == max) {
			if (val < min - EPS && angle < 0) return;
			if (val > max + EPS && angle > 0) return;
			if (min == max) return;
		}

		joint[rotationalAngle] = val;
	}
	joint.updateMatrix();
} // relativeTurn


function kinematic2D(joint, rotationalAngle, angle, ignoreIfPositive) {
	// returns >0 if this turn gets closer

	// swap Z<->X for wrist
	if (joint instanceof Wrist) {
		if (rotationalAngle == 'x')
			rotationalAngle = 'z';
		else if (rotationalAngle == 'z')
			rotationalAngle = 'x';
	}

	var screenPoint = new THREE.Vector3().copy(dragPoint.position);
	screenPoint = obj.localToWorld(screenPoint).project(camera);

	var distOriginal = mouse.distanceTo(screenPoint),
		oldAngle = joint[rotationalAngle];

	if (joint instanceof Head) { // head and neck
		oldParentAngle = joint.parentJoint[rotationalAngle];
		relativeTurn(joint, rotationalAngle, angle / 2);
		relativeTurn(joint.parentJoint, rotationalAngle, angle / 2);
		joint.parentJoint.updateMatrixWorld(true);
	}
	else {
		relativeTurn(joint, rotationalAngle, angle);
	}
	joint.updateMatrixWorld(true);

	screenPoint.copy(dragPoint.position);
	screenPoint = obj.localToWorld(screenPoint).project(camera);

	var distProposed = mouse.distanceTo(screenPoint),
		dist = distOriginal - distProposed;

	if (ignoreIfPositive && dist > 0) return dist;

	joint[rotationalAngle] = oldAngle;
	if (joint instanceof Head) { // head and neck
		joint.parentJoint[rotationalAngle] = oldParentAngle;
	}
	joint.updateMatrixWorld(true);

	return dist;
}


function inverseKinematics(joint, rotationalAngle, step) {
	// try going in postive or negative direction
	var kPos = kinematic2D(joint, rotationalAngle, 0.001),
		kNeg = kinematic2D(joint, rotationalAngle, -0.001);

	// if any of them improves closeness, then turn in this direction
	if (kPos > 0 || kNeg > 0) {
		if (kPos < kNeg) step = -step;
		kinematic2D(joint, rotationalAngle, step, true);
	}
}


function animate(time) {
	// no selected object
	if (!obj || !mouseButton) return;

	var elemNone = !cbRotZ.checked && !cbRotX.checked && !cbRotY.checked && !cbMovY.checked,
		spinA = (obj instanceof Ankle) ? Math.PI / 2 : 0;

	gauge.rotation.set(0, 0, -spinA);
	if (cbRotX.checked || elemNone && mouseButton & 0x2) gauge.rotation.set(0, Math.PI / 2, 2 * spinA);
	if (cbRotY.checked || elemNone && mouseButton & 0x4) gauge.rotation.set(Math.PI / 2, 0, -Math.PI / 2);

	var joint = cbMovY.checked ? model.body : obj;
	do {
		for (var step = 5; step > 0.1; step *= 0.75) {
			if (cbRotZ.checked || elemNone && (mouseButton & 0x1))
				inverseKinematics(joint, 'z', step);
			if (cbRotX.checked || elemNone && (mouseButton & 0x2))
				inverseKinematics(joint, 'x', step);
			if (cbRotY.checked || elemNone && (mouseButton & 0x4))
				inverseKinematics(joint, 'y', step);
			if (cbMovY.checked)
				inverseKinematics(joint, '', step);
		}

		joint = joint.parentJoint;
	}
	while (joint && !(joint instanceof Mannequin) && !(joint instanceof Pelvis) && !(joint instanceof Torso) && cbInverseKinematics.checked);
}


function onMouseMove(event) {
	if (obj) userInput(event);
}


function userInput(event) {
	if (event instanceof MouseEvent) {
		event.preventDefault();

		mouseInterface = true;
		mouseButton = event.buttons || 0x1;

		mouse.x = event.clientX / window.innerWidth * 2 - 1;
		mouse.y = -event.clientY / window.innerHeight * 2 + 1;
	}

	if (window.TouchEvent && event instanceof TouchEvent && event.touches.length == 1) {
		mouseButton = 0x1;

		touchInterface = true;
		mouse.x = event.touches[0].clientX / window.innerWidth * 2 - 1;
		mouse.y = -event.touches[0].clientY / window.innerHeight * 2 + 1;
	}
}


function getPosture() {
	prompt('The current posture is shown below. Copy it to the clipboard.', model.postureString);
}

function setPostureByJson(json) {
	if (json) {
		var oldPosture = model.posture;
		try {
			model.postureString = json;
		}
		catch (error) {
			alert('error');
			model.posture = oldPosture;
			if (error instanceof MannequinPostureVersionError)
				alert(error.message);
			else
				alert('The provided posture was either invalid or impossible to understand.');
			console.error(error);
		}
		renderer.render(scene, camera);
	}

}


function setPosture(id) {
	var json = "";

	switch (id) {
		case "0":
			json = '{"version":6,"data":[0,[0,-90,0],[0,0,-2],[0,0,5],[6,0,0],[0],[-6,-6,-0.6],[-6,0,0],[0],[6,6,-0.6],[7,-0.6,-5],[15],[-15,0,0],[10,10],[-7,0.6,-5],[15],[15,0,0],[10,10]]}';
			break;
		case "1":
			json = '{"version":6,"data":[0,[0,-90,0],[0,0,3.2],[0,0,5],[0.1,1.2,-11.1],[18.4],[-6,-6,-1.8],[-2.5,1.9,29],[0.1],[6,6,-22.8],[7,-0.6,17.4],[34],[-15,0,0],[10,10],[-7,0.6,-35.1],[18],[15.4,0,0],[10,10]]}';
			break;
		case "2":
			json = '{"version":6,"data":[-0.2,[0,-90,0],[3.2,8.9,-2.5],[0,0,5],[3.4,16.8,15.7],[18.5],[-6,-6,2.8],[-1.5,-3,-4.7],[0],[6,6,-8.7],[-0.5,-64.3,-37.4],[91.2],[-51.8,11.2,3.1],[38,10],[17.3,75.3,-57.3],[88.7],[82.8,0,0],[41.6,10]]}';
			break;
		case "3":
			json = '{"version":6,"data":[-0.2,[0,-90,0],[3.2,8.9,-2.5],[0,0,5],[3.4,16.8,15.7],[18.5],[-6,-6,2.8],[3.2,-3.3,-5.4],[0],[-0.3,7.2,-4.7],[2.1,-43.8,-15.2],[47.1],[-33.3,-6,-10.8],[3.8,10],[-4.3,51.9,-15.8],[42.5],[21.2,9,-2.4],[12.8,1.8]]}';
			break;
		case "4":
			json = '{"version":6,"data":[0,[-93.1,-90,0],[6.1,-1.3,-25.6],[0,0,-20.5],[12.5,19.7,50.6],[15],[-6,-6,16],[2.5,-11.9,68.8],[16.6],[3.4,15.3,15.6],[32.1,-11.3,47],[27.1],[-35.7,36.1,20.8],[10,10],[-66.5,-3.4,74.1],[15],[15,-21.8,5.8],[10,10]]}';
			break;
		case "5":
			json = '{"version":6,"data":[-0.3,[-83.7,-84.7,-90],[9.8,2.3,15.6],[3.4,0,0.4],[8.7,16.6,23.1],[32.7],[-6,-6,-5.7],[2.1,-1.3,10.3],[11.9],[6,6,-4.1],[39.3,-71.2,45.4],[102.4],[18.6,3.3,0.4],[46.3,100],[-89.8,65.4,86.8],[103.3],[-89.9,22.2,27.2],[28.9,-10]]}';
			break;
		case "6":
			json = '{"version":6,"data":[-16.2,[36.3,-90,0],[-8.8,-0.5,0.7],[0.3,0,14.9],[-3,11.5,127.9],[89.8],[-6.6,1.9,4.2],[-6,0,38.4],[100],[6,6,31.7],[46.1,-35.7,51.7],[44.2],[55.6,62.7,-56.9],[10,10],[-17.8,21.5,25.5],[25.7],[-1.5,-2.1,1.1],[22,10]]}';
			break;
		case "7":
			json = '{"version":6,"data":[-24.2,[11,-90,0],[-0.5,0.2,-17.1],[0.7,0.1,13],[-1.9,16.2,127.4],[150],[-6,-6,-32.9],[2.2,-19.1,125.5],[150],[6,6,-35],[54.4,-33.8,62.2],[33.8],[57.4,58.7,-49.1],[10,10],[-71.4,34.1,60.6],[65.3],[-56,-36.9,-44.3],[10,10]]}';
			break;
		case "8":
			json = '{"version":6,"data":[-9.3,[38.1,-90,0],[0,0,-10.7],[0,0,-7.7],[-11.6,7.9,95.3],[92],[-6,-6,-17.5],[-6.9,-8.4,-6],[0],[17.5,-4.2,-41.4],[47.6,39.1,118.1],[5.5],[-90,0,0],[10,10],[-58.9,-42.9,108.3],[8.4],[90,0,0],[10,10]]}';
			break;
		case "9":
			json = '{"version":6,"data":[-9.3,[-30.5,-90,0],[-5,7.8,-0.1],[2.9,-5,-14.1],[-4,-3.2,35.4],[48.1],[1.7,-3.4,19],[-6.9,-8.4,7.1],[103.4],[11.5,2.2,-34.8],[-21.9,-8.6,44.1],[5.5],[-15.6,16.5,-72.6],[116.3,65.3],[3.1,7.5,46.9],[8.4],[19.8,-7.5,-75.8],[120,75.2]]}';
			break;
		case "10":
			json = '{"version":6,"data":[-0.3,[5.5,-90,0],[0,0,1.3],[0,0,7.2],[-0.3,1.4,-20.9],[48.7],[-6,-6,16.3],[-1.2,3.7,28.1],[2.3],[6,6,-9.4],[17.4,4.4,25.4],[108.4],[-2.4,0,0],[120,100],[-8.9,3.6,-58.4],[102.6],[5.2,0,0],[120,99.9]]}';
			break;

		case "11":
			json = '{"version":6,"data":[-3,[21.7,-90,0],[0,0,-9.3],[0,0,7.2],[-3.8,2.2,-12.4],[25.5],[-6,-6,-0.1],[-4,8.3,76.3],[18.3],[6,6,-8.7],[7,-0.6,39.9],[63.3],[-15,0,0],[42.1,10],[-7,0.6,-63.4],[62.8],[5.2,0,0],[19.7,10]]}';
			break;
		case "12":
			json = '{"version":6,"data":[-7.2,[-55.4,-88.8,-84.7],[-1.5,-9.3,-9.4],[0,0,2.4],[-3.8,2.2,-11],[13.5],[-6,-6,0.2],[-4,8.3,105.6],[110],[6,6,-8.7],[10.2,5.8,80.4],[94.1],[-15,0,0],[42.1,10],[9.6,11,-66.8],[37.7],[5.2,0,0],[19.7,10]]}';
			break;
		case "13":
			json = '{"version":6,"data":[-12.3,[0,-60.9,0],[1.6,39.2,-12.4],[2.9,-30,5.8],[53.6,28.3,-45.2],[29.2],[10.8,2.4,87.7],[-6,0,76.9],[56.5],[6,6,20],[136.9,52.7,-70.3],[28.6],[-15,-65.3,0],[45.4,33.7],[-91.6,13,57.7],[25.9],[15,0,0],[104.8,83.7]]}';
			break;
		case "14":
			json = '{"version":6,"data":[-8.2,[0,-48.9,0],[-0.1,-3.5,-0.2],[-5.7,37.6,22],[-9.5,40.2,59.2],[87.2],[0.3,-9.9,-31.6],[-24.8,26.7,50.7],[86],[6,6,-27.5],[-16.1,11,172.3],[15],[-15,0,0],[10,10],[-51.1,7.3,-25.7],[48.9],[15,-21.2,0],[108.4,90.9]]}';
			break;
		case "15":
			json = '{"version":6,"data":[-6.7,[5.8,-48.8,4.4],[-6.9,-32.1,-19.8],[-12,34.5,6.7],[17.6,14.7,2.8],[68.1],[0.3,-9.9,-14.5],[-15.9,-15.8,44],[78],[9.2,-0.7,-24.9],[36.1,16.9,53.8],[40.3],[-4,9,0.1],[14.3,35.6],[-89.7,-75.6,-12.9],[49.8],[18.6,-9.8,0.9],[120,90.9]]}';
			break;
		case "16":
			json = '{"version":6,"data":[-6.9,[5.8,-48.8,4.4],[6,14.6,-18.8],[4.7,-33.4,9.4],[0.1,3.4,19.6],[89.2],[0.3,-9.9,0.3],[-8.8,-8,57.1],[64],[6,6,-5.4],[36.1,16.9,39],[128],[-70.4,-13.6,-28.2],[20.3,35.6],[-43.2,29.5,86.6],[72.4],[35.7,-9.1,3.7],[108.4,90.9]]}';
			break;
		case "17":
			json = '{"version":6,"data":[1.2,[52,-90,0],[0,0,50.3],[0,0,16.8],[1.6,5.2,-49.9],[0],[-6,-6,72.9],[1.2,8.1,54.2],[0],[6,6,67.6],[48.9,0.9,-88.1],[7.2],[-15,0,0],[10,10],[-7,0.6,107.3],[19.6],[15,-47.1,0],[10,10]]}';
			break;
		case "18":
			json = '{"version":6,"data":[1.2,[141.5,-86.7,89.2],[5.4,-28.6,64.8],[-0.8,23.2,0.6],[-14,1.8,51.3],[3.6],[2.9,-5.8,70.1],[-58.5,-37.2,-60],[72.5],[-3.4,9.7,68.9],[-7.6,57,155.6],[30.2],[23.6,-46.1,29.9],[19.9,26.7],[-83.6,-9.4,-28.7],[51.7],[-20,3.1,2.2],[10,10]]}';
			break;
		case "19":
			json = '{"version":6,"data":[1.7,[0,-40.4,-12.9],[9.5,-28.4,24.9],[-4,31.5,13.2],[0.9,14.4,-6.6],[0],[-6,-6,60.7],[11.5,-13.2,26.7],[0],[6,6,63.9],[-17.9,59.9,139.4],[49.7],[28.4,-70.1,31.6],[30,10],[-89.9,-63.5,-38.9],[15],[15,0,0],[10,10]]}';
			break;
		case "20":
			json = '{"version":6,"data":[3.8,[109.5,-90,0],[0,0,-8.2],[0,0,-10.3],[-4.6,0,0],[0],[-6,-6,75.8],[5.7,0,0],[0],[6,6,66.8],[43.6,52.9,145.2],[0.1],[-1.9,0,0],[10,10],[-52.6,-59.4,137.5],[0],[-5,0,0],[10,10]]}';
			break;

		case "21":
			json = '{"version":6,"data":[15,[0,-90,0],[0,0,-2],[0,0,5],[1,0,0],[0],[-8.6,-5.9,46],[-1.3,0,0],[0],[9.8,5.9,37.6],[54,89,99.4],[15],[-9.4,0.6,8.5],[92.9,100],[13.2,-69.5,168.2],[15],[11.4,-15.7,15.4],[108.8,100]]}';
			break;
		case "22":
			json = '{"version":6,"data":[33.1,[-5.6,-90,0],[0,0,-2],[0,0,21.6],[1.4,30.9,17],[106.8],[-8.6,-5.9,55.8],[-2.3,-27,14.8],[98.6],[9.8,5.9,37.6],[-10.5,69.8,51.1],[125.4],[0.9,28,9.2],[100,100],[23,-63.3,61.4],[131.4],[4.1,-19.8,8.4],[108.8,100]]}';
			break;
		case "23":
			json = '{"version":6,"data":[-8.8,[14.8,-90,0],[5.4,-28.3,6.6],[3.8,-7.5,-14.1],[-14.1,-4.9,68.6],[22.4],[-6,-6,-0.6],[-29.1,-16.8,-52.5],[46],[6,6,47.9],[103,-4.4,-11.9],[35.3],[-15,0,0],[20,20.6],[-87.1,-40.8,-56.3],[15],[15,0,0],[27.8,17.8]]}';
			break;
		case "24":
			json = '{"version":6,"data":[0,[-90,-16,-90],[11.7,-0.4,-3.3],[12.6,19.9,14.9],[5.3,25.9,6.9],[17],[-6,-6,47.6],[-11.3,-32.1,-9.8],[6.5],[6,6,31.8],[15.7,60.1,166.1],[15],[-15,0,0],[10,10],[-21.8,-71.1,153.6],[15],[23.6,35.1,-5],[13.8,10]]}';
			break;
		case "25":
			json = '{"version":6,"data":[-6.9,[90,-69.1,70.4],[-7.9,15.3,-30.1],[2,-21.8,15],[-13.8,21.8,53.6],[61.8],[-17.7,-3.2,-21.2],[-6,0,2.4],[90.3],[6,6,32.1],[7,-0.6,13.4],[93.4],[-45.2,20.4,49.3],[9.2,10],[-84.9,31,47.6],[60],[15,0,0],[10,10]]}';
			break;
		case "26":
			json = '{"version":6,"data":[8.2,[0,-90,0],[1,-18.3,3.2],[0,0,10.7],[13.9,25.2,-3.4],[10.9],[-6,-6,17.7],[-4.4,1.7,2.8],[11.2],[6,6,47.2],[13.5,4.7,122],[86.1],[-15,0,0],[25.3,10],[-15.3,-2.4,110],[113.1],[90,-64.6,87.6],[24.8,10]]}';
			break;
		case "27":
			json = '{"version":6,"data":[11.6,[33.3,-90,0],[-10.3,9.4,31.2],[3.2,-25.7,14.9],[1.7,33.8,65.9],[21.3],[-6,-6,-10.6],[-30.3,-8,9.9],[14.4],[6,6,56.1],[43.1,-53.6,-20],[15],[-15,0,0],[10,10],[89.1,-86.6,-117.9],[21.8],[15,0,0],[22.5,20.4]]}';
			break;
		case "28":
			json = '{"version":6,"data":[6.4,[15.4,-90,0],[21.6,-38.3,30],[1.5,19.6,7.8],[6,0.4,9.2],[16.1],[-5.9,6.7,23.9],[-10.9,-9.6,-27.2],[53.4],[13.5,-2.8,40.4],[74.7,-26.4,22.3],[60.8],[-15,0,0],[10,10],[51.5,-50.7,161.2],[117.8],[0.8,-19.9,9.5],[-5.9,10]]}';
			break;
		case "29":
			json = '{"version":6,"data":[-15.4,[-155.9,-87.4,-151.3],[3,-20.5,-2.7],[0,0,5],[16.8,30.9,79.8],[86.1],[-6,-6,8.9],[-15.6,0.3,-2],[93.3],[6,6,49.9],[6.1,40.3,82.2],[0],[-29.7,0.5,5.8],[117.9,100],[-90,6.6,110.9],[57.7],[14.5,81,-9.9],[10,99.9]]}';
			break;
		case "30":
			json = '{"version":6,"data":[8,[156.2,-87.6,161.1],[-1.6,-21.8,-25.4],[-2.1,22.5,4.4],[13,-1.4,21.6],[91.4],[-6,-6,25.5],[-30.1,-51.7,40.2],[134.3],[6,6,49.9],[6.1,40.3,82.2],[0],[-29.7,0.5,5.8],[117.9,100],[-90,6.6,110.9],[57.7],[14.5,81,-9.9],[10,99.9]]}';
			break;

		case "31":
			json = '{"version":6,"data":[3.7,[37.9,-90,0],[0,0,-15.5],[0,0,11.5],[4.7,-3.6,69.9],[49.4],[-6,-6,-0.6],[-6.7,1.7,111.1],[107.6],[6,6,-20.8],[41.4,-2.6,44],[79.6],[-28.1,58.5,2.3],[120,81],[-33.1,3.6,43],[79.7],[43.4,-54,20.3],[107.3,100]]}';
			break;
		case "32":
			json = '{"version":6,"data":[7.9,[-3.4,-89.2,154.5],[0,0,24.9],[0,0,25],[-4,-3.4,19.7],[0],[1.1,-12,57],[2.1,2.5,19],[0],[10.1,3.1,54.3],[-5.4,53.4,174.8],[15],[-81.1,0,0],[-10,10],[2.6,-52.9,171.9],[15],[89.9,0,0],[10,10]]}';
			break;
		case "33":
			json = '{"version":6,"data":[-2.6,[-3.4,-89.2,146.4],[0,0,42.3],[0,0,42],[-4,-3.4,-37.6],[8],[1.1,-12,57],[2.1,2.5,64.8],[134.6],[10.1,3.1,47.9],[-7.9,27.9,166.5],[94.1],[0.9,57.3,12.6],[4.7,2.2],[7.2,-21.2,165.2],[93.5],[0,-59.4,8.6],[1,10]]}';
			break;
		case "34":
			json = '{"version":6,"data":[-8.2,[135.8,-90,0],[0,0,-3.5],[0,0,5],[-6.8,-2.4,100.5],[0],[-6,-6,-15.6],[2.9,1.7,100.5],[0.6],[6,6,-14.2],[-89.3,73.2,-96.7],[0],[-31.7,0,0],[10,-3.4],[83.7,-73.2,-104.5],[0],[32.4,-0.8,-2.6],[10,10]]}';
			break;
		case "35":
			json = '{"version":6,"data":[-27.9,[60,-90,0],[0,0,34.3],[0.3,-3.5,28.3],[-6.8,-2.4,-19.6],[1.9],[-6,-6,72.8],[2.9,1.7,-19.9],[3.3],[6,6,69.7],[23.1,-26.8,34.1],[0],[-83.9,0,0],[4.8,-3.4],[-29.3,37.4,33.7],[0],[90,-2.6,-0.7],[10,-1.1]]}';
			break;
		case "36":
			json = '{"version":6,"data":[-28.9,[17.9,-90,0],[0,0,19.6],[0.1,10.9,1.4],[-17.1,80,106.5],[0],[-6,-6,-0.6],[0.7,-81,90],[0],[6,6,-0.6],[26.5,-52.7,-7.4],[12.3],[-60.2,0,0],[30.1,10],[-29.9,62.5,-1.7],[12.9],[43,13.9,-23.7],[4,10]]}';
			break;
		case "37":
			json = '{"version":6,"data":[7.5,[90,48.7,90],[31,-1,-1.7],[0,0,41.3],[18,57.1,13.2],[8],[-6,-6,-0.6],[-42.8,-38.5,10.7],[4.9],[6,6,-0.6],[-27.4,83.7,168.9],[11],[-80.5,0,0],[10,10],[137,-84.3,-57.7],[0.7],[92.9,0,0],[8.1,10]]}';
			break;
		case "38":
			json = '{"version":6,"data":[-11.1,[71.6,-90,0],[-0.8,-0.3,12.9],[0,0,15.4],[0.3,5.9,134.2],[68.5],[-8.5,-5.4,-9.5],[1.8,-7.6,136],[66.9],[6,6,-3.7],[38.7,-24.1,55.5],[10.1],[-15,49.6,7.1],[90.2,100],[-53.5,28.1,59.1],[8.4],[9.5,-25.3,8.9],[95,100]]}';
			break;
		case "39":
			json = '{"version":6,"data":[-14.2,[21.6,-90,0],[0,0,3.9],[0,0,21.7],[-2.9,34.8,91.5],[112.4],[-10.9,-4.3,-39],[6.9,-30.5,96.2],[111.7],[1,4.4,-34.8],[-39.7,16.4,-165],[1.6],[-63.6,-6.6,59.4],[76.1,51.9],[42.4,-22.9,-160.9],[-2.8],[67.3,9.5,60.9],[100.4,10]]}';
			break;
		case "40":
			json = '{"version":6,"data":[0,[-90.7,-71.1,-156.1],[1.1,-10,-24.2],[22.1,-13.6,23.7],[-18.5,34.1,120.2],[120.1],[-9.2,-2.9,-54.8],[-10.7,-14,125.6],[69.7],[25.1,-6.4,8.4],[67.1,4.2,57.8],[15],[-15,0,0],[48.6,10],[-64.6,-22.5,15.8],[32.2],[-5.7,0,0],[10,10]]}';
			break;

		case "41":
			json = '{"version":6,"data":[-1.2,[35.6,-90,0],[-0.3,0.1,-1.6],[2.7,-28.3,5.7],[9.3,1.4,41.9],[7.1],[-8.9,-6,0.4],[-7.6,-0.1,44.1],[4.9],[8.5,6,4.4],[-5.9,-13.8,38.1],[0],[-15,0,-55],[120,100],[9.3,13.7,35.4],[3.1],[12.3,7.2,-66.6],[120,100]]}';
			break;
		case "42":
			json = '{"version":6,"data":[-15.4,[-155.9,-87.4,-151.4],[-14.8,-9.8,-19.2],[0,0,-16.8],[16.8,30.9,79.8],[86.1],[-6,-6,8.9],[-15.6,0.3,-2],[93.3],[6,6,49.9],[64.8,24.8,59.7],[58.4],[-133.8,-39.7,169.2],[97.7,36],[-67.2,9.9,75.6],[103.7],[58.9,35,-60.5],[119.9,99.9]]}';
			break;
		case "43":
			json = '{"version":6,"data":[-31.9,[-155.9,-87.4,121.3],[-14.8,-9.8,3.8],[0,0,21.7],[16.8,30.9,-5.8],[0.1],[-6,-6,72.2],[-28.1,-25.3,-5.8],[0.1],[6,6,54.7],[63.3,61.8,92.7],[81.8],[-175.1,-24.7,146.3],[97.7,36],[-50.3,-34.5,87.9],[115.2],[72.9,13.9,-54],[120,99.9]]}';
			break;
		case "44":
			json = '{"version":6,"data":[-3.8,[-155.9,-87.4,-151.4],[4.5,10.4,-10.2],[3,15.3,2.1],[16.8,30.9,28.6],[36.6],[-14.2,-7,6.6],[-15.6,0.3,0.2],[42],[20.5,-3.4,-32.3],[20.3,-6.8,43.3],[31.5],[52.2,-27.1,15.8],[76.8,36],[-5.8,39,12.2],[69.1],[7.6,7.5,15],[119.9,99.9]]}';
			break;
		case "45":
			json = '{"version":6,"data":[0,[0,-90,0],[0,0,-2],[0,0,5],[-4.8,19.1,-1.8],[0],[3.8,-6,0.4],[2.5,-17.5,-2.3],[0],[0.3,6,0],[6.1,-48,-2.4],[15],[-14,-39.5,-9.7],[10,10],[-51.7,-60.7,51.8],[140.4],[-8.2,67,8.6],[4.8,1.6]]}';
			break;
		case "46":
			json = '{"version":6,"data":[-1.3,[23.1,-90,0],[3.8,41.7,-4.6],[-2.6,-16.8,9.2],[-3.2,7.8,41.3],[14.6],[-6,-6,0.7],[-3.9,-5.4,1.3],[14.2],[6,6,39.6],[21.9,-44.5,15.5],[138.5],[-15,0,0],[120,99.9],[-75.8,-29.1,34.3],[50.7],[15,0,0],[115.3,99.9]]}';
			break;
		case "47":
			json = '{"version":6,"data":[-1.6,[0,-90,0],[-13.3,-5.4,15.8],[-0.3,38.6,0.5],[15.1,21.6,13.9],[20.8],[-13.4,-5.9,-1.4],[-13.6,-7.3,-12.7],[9.4],[6,6,-17],[51.7,54.3,-7.4],[112.4],[84.9,-67.9,89.6],[107,100],[-62.1,33.1,44.3],[138.2],[15,0,0],[105.9,100]]}';
			break;
		case "48":
			json = '{"version":6,"data":[-0.3,[7.7,-90,0],[-24.7,-4.4,1.5],[-0.3,38.6,0.5],[0.9,19.9,9.4],[10.5],[-5.2,-6,-8.3],[-17.4,-23.6,2.6],[9.4],[6,6,9],[117.5,15.2,12.3],[6.9],[-4.4,-33.2,-12.3],[125.1,97],[-43.9,44.5,54.6],[138.2],[15,0,0],[105.9,100]]}';
			break;
		case "49":
			json = '{"version":6,"data":[2.8,[-68.6,-34.3,-54.9],[16.4,14.6,8.6],[6.7,-18.6,-10.1],[63.1,60.6,-6.1],[7.2],[-12.6,4.6,8.1],[-54.1,-39.1,29.6],[10.4],[12.3,-34,58.3],[57.6,-28.6,52.5],[117.9],[-15,0,0],[120,99.9],[-24.5,30.4,-47],[48.4],[15,0,0],[115.3,99.9]]}';
			break;
		case "50":
			json = '{"version":6,"data":[2,[-68.6,-34.3,-54.9],[6.7,13,10.9],[6.7,-18.6,-10.1],[63.1,60.6,-6.1],[7.2],[-12.6,4.6,0.1],[-58.5,-39.1,34.5],[10.4],[31.3,-29.8,19.7],[57.6,-28.6,52.5],[117.9],[-15,0,0],[120,99.9],[-19.3,54.3,-10.9],[103.7],[15,0,0],[115.3,99.9]]}';
			break;

		case "51":
			json = '{"version":6,"data":[-10.1,[15.7,-90,0],[7.8,41,-13.9],[2.7,-28.6,5.7],[30.6,39,-38],[12.3],[-39.4,-7.2,-38],[-6,0,85.6],[68.6],[6,6,-0.6],[75,73.4,-19.7],[23.4],[-15,-29.2,0],[10,10],[-20,-48.7,107],[0.6],[3.4,11.7,-85.9],[113.8,74.1]]}';
			break;
		case "52":
			json = '{"version":6,"data":[-3.8,[15.7,-90,0],[-8.9,12.4,31.1],[-0.1,-17.4,-2.7],[4.9,-0.9,-4.1],[15.4],[-22.7,-17,-38.4],[-6,0,54.6],[39.6],[6,6,-0.6],[29,4.7,131.7],[57.4],[-15,-16.6,7.2],[119.9,100],[-28,-37.2,114.5],[66.6],[37.7,12.7,-1.5],[113.8,87.6]]}';
			break;
		case "53":
			json = '{"version":6,"data":[-3.8,[15.7,-90,0],[-12.5,10.2,25.4],[1.4,-17.5,-2.3],[4.9,-0.9,-4.1],[15.4],[-22.7,-17,-38.4],[-6,0,54.6],[39.6],[6,6,-0.6],[-1.9,14.5,71.2],[113.5],[-7.7,-26.2,-8],[119.9,100],[-49.3,16.2,110.1],[66.6],[37.7,-19,0],[113.8,87.6]]}';
			break;
		case "54":
			json = '{"version":6,"data":[-3.8,[15.7,-90,0],[-6.7,22.2,11.3],[1.4,-17.1,0.3],[4.9,-0.9,-4.1],[15.4],[-22.7,-17,-38.4],[-6,0,54.6],[39.6],[6,6,-0.6],[-9.9,0.8,29.8],[95.8],[-1.3,-52.8,38.7],[119.9,100],[-83.9,10.7,88.1],[66.6],[22.7,-10.3,-3],[113.8,87.6]]}';
			break;
		case "55":
			json = '{"version":6,"data":[-3.8,[15.7,-90,0],[-6.7,22.2,11.3],[1.4,-17.1,0.3],[4.9,-0.9,-4.1],[15.4],[-22.7,-17,-38.4],[-6,0,54.6],[39.6],[6,6,-0.6],[32.7,-42.7,77.1],[39.9],[18.3,-22.4,39.5],[120,99.4],[-64.8,12.9,24.1],[87.4],[8.2,19.7,-6.8],[113.8,87.6]]}';
			break;
		case "56":
			json = '{"version":6,"data":[-6.4,[70.6,-90,0],[4,-26.3,2.3],[-15.4,34.1,29.7],[-39.1,13.5,117.6],[30.3],[-1.3,-5.8,13.8],[24.5,-16.3,116],[36.3],[9,-14.5,10.1],[11.6,18.6,49.3],[17.5],[-89.3,-83.6,-111.4],[120,100],[-32.7,5.9,32.1],[79.2],[22.7,-73.9,6.2],[104.8,100]]}';
			break;
		case "57":
			json = '{"version":6,"data":[-23,[72.7,-90,0],[-6,-16,10],[-0.3,6.6,5.5],[-10.1,23.2,121],[147.8],[-6.6,1.9,28.1],[3.5,-15.9,121.3],[147.5],[6,6,28.4],[47.3,-4.3,51.5],[56],[-90,16.2,74.9],[50.5,63.9],[-86.2,13.9,101.4],[3],[79.5,0.8,-30.7],[15.6,-3.8]]}';
			break;
		case "58":
			json = '{"version":6,"data":[[0,-2.2,0],[2.4,-90,0],[0,0,-7.5],[0,0,-2.1],[7.2,14.7,31.4],[31.3],[-6,-6,-1.2],[-8.2,-21.6,32.2],[36.9],[6,6,-1.2],[14.2,-11.7,-4.9],[62.3],[25.8,-23.9,-3.1],[28.8,25.2],[-15.7,12.3,8],[78.7],[-51,-0.6,17.8],[24.8,20.8]]}';
			break;
		case "59":
			json = '{"version":6,"data":[-11.7,[-64.5,-90,0],[0,-0.1,18.2],[-2.9,20.5,8.1],[12.2,1.2,10.5],[59.6],[-6,-6,18.5],[-25.7,0.5,1.2],[107.7],[6,6,-19.4],[89.9,51.7,33.3],[52.1],[64.3,36.3,-21.2],[10,10],[-62.7,4.5,-37.7],[74.6],[-17.3,0,0],[10,10]]}';
			break;
		case "60":
			json = '{"version":6,"data":[1.8,[8.6,-90,0],[0,0,11.6],[0,0,9.1],[-3.1,0,0],[0],[-3.1,-4.8,22.3],[4.7,-0.1,-0.5],[0],[2,11.3,23.6],[90,23,0],[4.6],[-4,0,0],[30.5,10],[-90,-24.6,0],[5.8],[1.2,19.4,0],[27.5,15.4]]}';
			break;

		case "61":
			json = '{"version":6,"data":[0.3,[3.1,-21.6,1.1],[5.4,-6.3,-5.7],[6.1,-25.3,-0.3],[21,0,0],[0],[-6,-6,48.7],[-6.8,-20.9,4.9],[9.6],[1.3,6,-0.1],[28.3,-2.4,-33.1],[71.4],[-2.2,-23.1,0],[29,10],[-47.4,-77.8,67.8],[6.6],[1.1,0,-54.3],[120,100]]}';
			break;
		case "62":
			json = '{"version":6,"data":[-4.7,[-179.6,-40.2,-180],[-4.8,-20.8,-10.4],[0.2,24.4,-3.4],[12.3,43.3,38],[53.9],[-6,-6,-4.8],[-12.5,-1.6,30.7],[65.3],[14.1,1.1,-31.4],[4.4,-18.4,81.8],[68.4],[19.2,4.7,70.8],[36.1,71.5],[-86,-31.7,66.9],[97.1],[12,-17.3,-6.5],[120,100]]}';
			break;
		case "63":
			json = '{"version":6,"data":[5.8,[26.3,-90,0],[-17.2,-47.9,-30.2],[3.2,24.3,23.5],[-9.8,13.1,137.5],[150],[-1,11.7,34.7],[-56.9,-66.9,17.5],[123.2],[10.7,7.6,27.6],[52.1,-51.7,46.2],[12.5],[-6.9,0,0],[104.2,90.7],[-55.4,13.5,-8],[33.6],[-5.7,-3.7,9.6],[21.4,10]]}';
			break;
		case "64":
			json = '{"version":6,"data":[6.6,[155,-52.8,130.6],[-9,-19.2,23.6],[-13.5,23.8,25.7],[-12.2,18.4,12],[19.5],[-6,-6,51.3],[1.9,-22.6,-0.8],[21.4],[6,6,42.7],[-74.2,83.4,-132.3],[22.5],[-10.2,0,0],[120,100],[-7.3,-45.7,7.6],[18.2],[-11.1,-28.7,-6.9],[119.9,84.8]]}';
			break;
		case "65":
			json = '{"version":6,"data":[-19.6,[15.8,-90,0],[0,0,5.2],[0,0,-1.3],[12.9,12.7,119],[100],[-14.4,-5.8,8.4],[-37,-28.5,14.9],[123.8],[-1.5,-8.6,-2.5],[63.6,-3.6,77.9],[105.1],[-15,-89.9,-13.1],[120,100],[-62.4,7.3,87.6],[106.6],[15,71.2,-7.2],[120,100]]}';
			break;
		case "66":
			json = '{"version":6,"data":[0,[6.3,-90,0],[0,0,-6.1],[0,0,-12.8],[-3,13.1,18.5],[21.9],[-6,-6,-5.7],[-1.1,-1.9,10.2],[11.9],[6,6,-4.1],[5.1,-21.2,10.8],[12.1],[-15,0,0],[10,10],[-3.7,34.1,10.4],[12.2],[8,-14.8,0.7],[10,10]]}';
			break;
		case "67":
			json = '{"version":6,"data":[0,[0,-90,0],[5.2,-12.1,-1.1],[8.8,-19.7,14.4],[9.3,-0.4,-7],[3.6],[-14,-5.9,-1.3],[-5.2,-11.3,5.4],[8.5],[6,6,-0.6],[43.7,-30.4,10.6],[15],[-82.5,0.4,58.3],[10,10],[-1.8,46.3,-7.2],[85],[33.6,-16,0],[10,10]]}';
			break;
		case "68":
			json = '{"version":6,"data":[-1.4,[13.2,-90,0],[0,0,24.9],[0,0,9.9],[3.8,20.3,32.5],[26.5],[-6,-6,-6.2],[-3,-13.3,3.5],[17.3],[6,6,-19.2],[2.1,68.8,91.3],[110.6],[-15,-30.5,0],[103.1,100],[-16.7,-78.5,110.3],[81],[28.6,69.6,-24.5],[119.9,98.3]]}';
			break;
		case "69":
			json = '{"version":6,"data":[4.7,[11.7,-90,0],[7.2,-15.1,25.9],[-1.2,13.1,5.1],[16.5,22.8,8.4],[103.6],[-6,-6,35.6],[-27.8,-19.8,-7.7],[115.9],[6,6,27.1],[89.5,80.1,20.6],[104.9],[-15,0,0],[120,89.6],[-67.2,-50.7,-6.5],[131.7],[15,0,0],[120,100]]}';
			break;
		case "70":
			json = '{"version":6,"data":[0,[0,-90,0],[5.4,-0.2,16.4],[0,0,-2.8],[3.5,0,-9.7],[12.8],[-6,-6,-7],[-5.9,-0.2,3.1],[9.3],[6,6,-5.6],[42.9,1.8,52.7],[142.2],[-1.3,-63,-4.5],[10,10],[-35.6,17.1,51.6],[143.1],[15,45.3,-9.8],[10,10]]}';
			break;

		case "71":
			json = '{"version":6,"data":[-29.6,[8.6,-90,0],[0,0,-8.2],[0,0,5],[6,0,154.1],[112],[-6,-6,36.7],[-6,0,133.5],[73.4],[6,6,-3.9],[25.1,-24.5,51.1],[17],[5.7,1.9,4.9],[83,109.7],[-29,21.7,52.6],[37.3],[-45.2,-29.1,-21.3],[21.8,10]]}';
			break;
		case "72":
			json = '{"version":6,"data":[-29.6,[-41.1,-90,0],[0,0,-9.2],[0,0,-15.9],[6,0,49.5],[0],[-6,-6,17.7],[-6,0,110.9],[123.4],[6,6,26.8],[25.1,-24.5,-36.3],[0],[-59.4,-8.1,-2.7],[4.9,-2.2],[-29,21.7,-37],[8.5],[49.2,12.5,40.7],[10.3,11.4]]}';
			break;
		case "73":
			json = '{"version":6,"data":[-30.1,[-0.2,-90,0],[0,0,-16.2],[0,0,5],[-71.7,-21.6,131.7],[156.1],[-49.7,-30.7,21.4],[65.8,12.9,129.7],[147.4],[36.8,1.8,53.7],[25.1,-24.5,32.1],[42.3],[8.3,47.9,-3.6],[40.5,20.5],[-29,21.7,35.1],[37.3],[-45.2,-29.1,-15.6],[21.8,10]]}';
			break;
		case "74":
			json = '{"version":6,"data":[-30.4,[8.6,-90,0],[0,0,-11.1],[0,0,5],[-7.5,-9.9,153.8],[112],[2.4,4.3,36.5],[57.5,21.9,132.4],[114.3],[22.4,15,39.2],[27.5,-27.6,31.7],[58.3],[21,42.9,9.4],[11.8,46.9],[-29,21.7,41.6],[51.4],[-45.2,-29.1,-21.3],[21.8,10]]}';
			break;
		case "75":
			json = '{"version":6,"data":[-12.3,[-9.1,-90,0],[0,0,-6.5],[0,0,5],[6,0,76.6],[78.6],[-6,-6,18.6],[-6,0,76.5],[87.9],[6,6,10],[29.4,-44,32.1],[19.8],[-42.6,14.3,15.8],[10,10],[-5.5,0.5,-5.3],[15.3],[15,0,0],[10,10]]}';
			break;
		case "76":
			json = '{"version":6,"data":[-12.3,[-9.1,-90,0],[0,0,-7],[0,0,5],[-9.4,-13.1,73.1],[78.6],[-6.8,-3.7,18.5],[22,16.9,85.3],[69.2],[11.5,1,47.2],[29.4,-44,38.2],[34.9],[-35.9,33,21.8],[0.5,10],[-53.7,54.8,60.7],[29],[47.7,-24.8,15.1],[10,10]]}';
			break;
		case "77":
			json = '{"version":6,"data":[-32.4,[-87.6,89.8,-7.1],[0,0,30.2],[0,0,30.6],[-2.9,4.7,6.1],[107.9],[-6,-6,46.8],[3.6,-5.2,6.9],[81.5],[6,6,-16.9],[77.6,18.9,67.1],[105.6],[5.4,0,0],[10,10],[-81.7,-20.3,71.8],[107.5],[-4.9,-2.7,-1],[12.5,10]]}';
			break;
		case "78":
			json = '{"version":6,"data":[-29.9,[-71.7,-90,0],[-5,-4,-12.8],[0,0,-19.6],[2.1,12.6,18.2],[2.8],[-6,-6,-0.6],[-2.2,-8.8,74.9],[113.5],[-9.3,-10.4,34.1],[-0.3,-23,-71.4],[105.4],[0.3,52.3,-0.5],[10,10],[4,43.9,-63.2],[99.1],[3.3,-21.4,-5.5],[0.4,10]]}';
			break;
		case "79":
			json = '{"version":6,"data":[-27.8,[-87.3,4.4,-13.2],[7.1,10.1,-24.6],[-10.9,4.3,-18.4],[-2,-1.6,81.7],[99.8],[1.6,-6.7,24.6],[0.9,20.3,107.5],[104.5],[-9.3,-10.4,34.1],[-4.7,-18.4,34.1],[146.4],[-2.6,17.1,0.5],[10,10],[-23.6,53.3,54.8],[123.2],[-1.4,-44.5,6.5],[-10,-9.9]]}';
			break;
		case "80":
			json = '{"version":6,"data":[-27.8,[-87.3,4.4,-13.2],[2.6,12.1,-23.7],[-10.9,4.3,-18.4],[-2,-1.6,51.6],[70],[1.6,-6.7,24.6],[29.7,8.7,12.5],[78.3],[-22.9,9.8,34],[-4.9,-22.2,34],[109],[-1.9,17.1,0.3],[5.1,-2.7],[17.3,21.1,11.7],[89],[32.6,-36,28.9],[1.1,-9.9]]}';
			break;
		case "81":
			json = '{"version":6,"data":[-0.2,[0,-90,0],[3.2,8.9,-2.5],[0,0,5],[3.4,16.8,15.7],[18.5],[-6,-6,2.8],[-1.5,-3,-4.7],[0],[6,6,-8.7],[-0.5,-64.3,-37.4],[91.2],[-51.8,11.2,3.1],[38,10],[17.3,75.3,-57.3],[88.7],[82.8,0,0],[41.6,10]]}';
			break;
		default:
			json = '{"version":6,"data":[-32.4,[84.5,88.3,-179.2],[1.2,0.5,8.6],[4.6,34.8,7.9],[-0.7,61.6,21.5],[20.1],[-4.1,-7.8,47],[9.3,-57,12.2],[7.4],[4.6,7.1,27.6],[89.9,65.8,55.8],[132.3],[5.4,0,0],[10,10],[-89.8,-69.9,43.4],[137.2],[-4.9,-2.7,-1],[12.5,10]]}';
	}


	if (json) {
		var oldPosture = model.posture;
		try {
			model.postureString = json;
		}
		catch (error) {
			alert('error');
			model.posture = oldPosture;
			if (error instanceof MannequinPostureVersionError)
				alert(error.message);
			else
				alert('The provided posture was either invalid or impossible to understand.');
			console.error(error);
		}
		renderer.render(scene, camera);
	}
}


