AFRAME.registerComponent('clipping-plane', {
    schema: {
        gltfURL: { type: 'string', default: '' },
        gltfPosition: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
        gltfScale: { type: 'vec3', default: { x: 1, y: 1, z: 1 } },
        clippingDirection: { type: 'string', default: 'top-to-bottom' },
        gltfMatSide: { type: 'boolean', default: false },
        planeConstant: { type: 'float', default: 2.0 }, // from where it should start
        minScrollValue: { type: 'float', default: -1.0 }, // min position on y axis
        maxScrollValue: { type: 'float', default: 2.0 }, // // max position on y axis
        mouseScrollSpeed: { type: 'float', default: 0.0005 },
        touchScrollSpeed: { type: 'float', default: 0.01 }
    },
    init: function () {
        let scene = document.querySelector("a-scene").object3D;
        let object;
        let localPlane;
        let matrix;
        //let clippingPl = this.data.clippingPlaneEnabled;
        let gltfPos = this.data.gltfPosition;
        let gltfScl = this.data.gltfScale;
        let gltfSide = this.data.gltfMatSide;
        let minScroll = this.data.minScrollValue;
        let maxScroll = this.data.maxScrollValue;
        let mScroll = this.data.mouseScrollSpeed;
        let tScroll = this.data.touchScrollSpeed;

        let cam = document.querySelector("a-camera");
        cam.setAttribute("cursor", "rayOrigin: mouse;");
        cam.setAttribute("raycaster", "objects: .clickable");

        if (this.data.clippingDirection == "top-to-bottom") {
            // Top to bottom
            localPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0));
            localPlane.constant = this.data.planeConstant;
            matrix = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
            localPlane.normal.applyMatrix4(matrix);
        } else if (this.data.clippingDirection == "bottom-to-top") {
            // Bottom to top
            localPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0));
            localPlane.constant = this.data.planeConstant;
            matrix = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
            localPlane.normal.applyMatrix4(matrix);
        } else if (this.data.clippingDirection == "left-to-right") {
            // Left to right
            localPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0)); // plane with normal vector along the x-axis
            localPlane.constant = this.data.planeConstant;
            matrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);
            localPlane.normal.applyMatrix4(matrix);
        } else if (this.data.clippingDirection == "right-to-left") {
            // Right to left
            localPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0)); // plane with normal vector along the x-axis
            localPlane.constant = this.data.planeConstant; // set the distance from the origin
            matrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);
            localPlane.normal.applyMatrix4(matrix);
        } else if (this.data.clippingDirection == "front-to-back") {
            // Front to back
            localPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0));
            localPlane.constant = this.data.planeConstant;
            matrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
            localPlane.normal.applyMatrix4(matrix);
        } else if (this.data.clippingDirection == "back-to-front") {
            // Back to front
            localPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0));
            localPlane.constant = this.data.planeConstant;
            matrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
            localPlane.normal.applyMatrix4(matrix);
        }

        // Load model using GLTFLoader
        let gltfEntity = document.createElement('a-entity');
        gltfEntity.setAttribute('gltf-model', `${this.data.gltfURL}`);
        gltfEntity.className = "clickable";
        gltfEntity.addEventListener('model-loaded', (e) => {
            object = e.detail.model;
            object.traverse(function (node) {
                if (node.isMesh) {
                    let meshMaterial = node.material.clone(); // clone original material
                    meshMaterial.clippingPlanes = [localPlane]; // set clipping planes for the mesh material
                    meshMaterial.clipShadows = true;
                    if(gltfSide){
                        meshMaterial.side = THREE.DoubleSide;
                    }
                    node.material = meshMaterial; // set the cloned material as the mesh's material
                    node.castShadow = true;
                    node.position.x = gltfPos.x;
                    node.position.y = gltfPos.y;
                    node.position.z = gltfPos.z;
                    node.scale.x = gltfScl.x;
                    node.scale.y = gltfScl.y;
                    node.scale.z = gltfScl.z;
                }
            });
            scene.add(object); // Add the model to the A-Frame scene
        });
        this.el.appendChild(gltfEntity);


        // Renderer
        let renderer = document.querySelector("a-scene").renderer;
        renderer.shadowMap.enabled = true;
        // Clipping setup (renderer)

        Empty = Object.freeze([]);
        renderer.clippingPlanes = Empty;
        renderer.localClippingEnabled = true;

        // Event listeners for mousewheel and touchmove
        gltfEntity.addEventListener("click", function () {
            document.addEventListener("mousewheel", mouseScroll);
            document.addEventListener("touchmove", touchMove);
        });
        function mouseScroll(event) {
            const MIN_SCROLL = minScroll; 
            const MAX_SCROLL = maxScroll; 
            const delta = event.wheelDeltaY || event.deltaY || 0;
            const deltaConstant = delta * mScroll; 
            localPlane.constant += deltaConstant;
            if (localPlane.constant < MIN_SCROLL) {
                localPlane.constant = MIN_SCROLL;
            } else if (localPlane.constant > MAX_SCROLL) {
                localPlane.constant = MAX_SCROLL;
            }
        }
        let prevTouchY;
        function touchMove(event) {
            const MIN_SCROLL = minScroll; 
            const MAX_SCROLL = maxScroll; 
            // Get current touch position
            if (!event.targetTouches.length) return;
            const currTouchY = event.targetTouches[0].clientY;
            let deltaY;
            if (prevTouchY === undefined) {
                deltaY = 1; // initialize to 1 on first call
            } else {
                deltaY = prevTouchY - currTouchY;
            }
            prevTouchY = currTouchY;
            const deltaConstant = deltaY * tScroll; 
            localPlane.constant += deltaConstant;
            if (localPlane.constant < MIN_SCROLL) {
                localPlane.constant = MIN_SCROLL;
            } else if (localPlane.constant > MAX_SCROLL) {
                localPlane.constant = MAX_SCROLL;
            }

        }

    },

});