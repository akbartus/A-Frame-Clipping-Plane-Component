AFRAME.registerComponent('clipping-plane', {
    schema: {
        clippingDirection: { type: 'string', default: 'top-to-bottom' },
        materialSide: { type: 'boolean' },
        planeConstant: { type: 'float', default: 2.0 }, // from where it should start
        minScrollValue: { type: 'float', default: -2.0 }, // min position on y axis
        maxScrollValue: { type: 'float', default: 2.0 }, // max position on y axis
        mouseScrollSpeed: { type: 'float', default: 0.0005 },
        touchScrollSpeed: { type: 'float', default: 0.01 },
    },

    init: function () {
        let cam = document.querySelector("a-camera");
        cam.setAttribute("cursor", "rayOrigin: mouse;");
        cam.setAttribute("raycaster", "objects: .clickable");
        let matSide = this.data.materialSide;
        let minScroll = this.data.minScrollValue;
        let maxScroll = this.data.maxScrollValue;
        let mScroll = this.data.mouseScrollSpeed;
        let tScroll = this.data.touchScrollSpeed;
        let matrix;

        const allEntities = document.querySelectorAll("a-entity");
      

        // Set up event listeners for each entity
        for (let i = 0; i < allEntities.length; i++) {

            const localPlanes = [];
            const clippingDir = allEntities[i].getAttribute("clipping-plane").clippingDirection;
            // Create a new THREE.Plane object for each gltf model and push it to the localPlanes array
            let localPlane;
            if (clippingDir == "top-to-bottom") {
                // Top to bottom
                localPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0));
                localPlane.constant = this.data.planeConstant;
                matrix = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
                localPlane.normal.applyMatrix4(matrix);
            } else if (clippingDir == "bottom-to-top") {
                // Bottom to top
                localPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0));
                localPlane.constant = this.data.planeConstant;
                matrix = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
                localPlane.normal.applyMatrix4(matrix);
            } else if (clippingDir == "left-to-right") {
                // Left to right
                localPlane = new THREE.Plane(new THREE.Vector3(0, 2, 0)); // plane with normal vector along the x-axis
                localPlane.constant = this.data.planeConstant;
                matrix = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
                localPlane.normal.applyMatrix4(matrix);
            } else if (clippingDir == "right-to-left") {
                // Right to left
                localPlane = new THREE.Plane(new THREE.Vector3(0, -2, 0)); // plane with normal vector along the x-axis
                localPlane.constant = this.data.planeConstant; // set the distance from the origin
                matrix = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
                localPlane.normal.applyMatrix4(matrix);
            } else if (clippingDir == "front-to-back") {
                // Front to back
                localPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0));
                localPlane.constant = this.data.planeConstant;
                matrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
                localPlane.normal.applyMatrix4(matrix);
            } else if (clippingDir == "back-to-front") {
                // Back to front
                localPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0));
                localPlane.constant = this.data.planeConstant;
                matrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
                localPlane.normal.applyMatrix4(matrix);
            }

            localPlanes.push(localPlane);
            // Set Clipping Plane for GLTF 
            if (allEntities[i].getAttribute("gltf-model")) {
                allEntities[i].addEventListener('model-loaded', (e) => {
                    const object = e.detail.model;
                    object.traverse(function (node) {
                        if (node.isMesh && localPlane) {
                            let meshMaterial = node.material.clone();
                            meshMaterial.clippingPlanes = localPlanes;
                            meshMaterial.clipShadows = true;
                            if (matSide) {
                                meshMaterial.side = THREE.DoubleSide;
                            }
                            node.material = meshMaterial;
                            node.castShadow = true;
                        }
                    })
                });
            } else {
                // Set clipping plane for custom entity (not GLTF)
                if (allEntities[i] != null) {

                    if (allEntities[i].object3D.children) {
                        allEntities[i].addEventListener('loaded', (e) => {
                            allEntities[i].object3D.children[0].material.clippingPlanes = localPlanes;
                            if (matSide == true) {
                                allEntities[i].object3D.children[0].material.side = THREE.DoubleSide;
                            }
                            allEntities[i].object3D.children[0].material.clipShadows = true;

                        })
                    }
                }
            }
            // Set up event listeners for mousewheel and touchmove on click
            allEntities[i].addEventListener("click", function () {
                document.addEventListener("mousewheel", mouseScroll);
                document.addEventListener("touchmove", touchMove);
            });

            function mouseScroll(event) {
                const delta = event.wheelDeltaY || event.deltaY || 0;
                const deltaConstant = delta * mScroll;

                if (localPlane) {
                    localPlane.constant += deltaConstant;
                    if (localPlane.constant < minScroll) {
                        localPlane.constant = minScroll;
                    } else if (localPlane.constant > maxScroll) {
                        localPlane.constant = maxScroll;
                    }
                }
            }

            let prevTouchY;
            function touchMove(event) {
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
                if (localPlane) {
                    localPlane.constant += deltaConstant;
                    if (localPlane.constant < minScroll) {
                        localPlane.constant = minScroll;
                    } else if (localPlane.constant > maxScroll) {
                        localPlane.constant = maxScroll;
                    }
                }
            }
        }

        // Enable local clipping and set the clipping planes to an empty array
        const renderer = document.querySelector("a-scene").renderer;
        renderer.localClippingEnabled = true;
        renderer.clippingPlanes = [];
    },
});