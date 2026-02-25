AFRAME.registerComponent('ai-agent', {
    schema: {
        role: { type: 'string', default: 'civilian' }, // civilian, responder
        state: { type: 'string', default: 'idle' }, // idle, panic, moving
        speed: { type: 'number', default: 2.0 }
    },

    init: function () {
        this.direction = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();

        // visuals
        let geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 12);
        let material = new THREE.MeshStandardMaterial({ color: this.data.role === 'civilian' ? 'blue' : 'green' });
        this.mesh = new THREE.Mesh(geometry, material);
        this.el.setObject3D('mesh', this.mesh);
    },

    tick: function (time, timeDelta) {
        if (this.data.state === 'panic') {
            this.moveRandomly(timeDelta / 1000);
        } else if (this.data.state === 'evacuate_flood') {
            this.moveToHighGround(timeDelta / 1000);
        }
    },

    moveToHighGround: function (dt) {
        if (!this.currentPath) {
            if (!this.waitingForPath) {
                this.waitingForPath = true;
                let currentPos = this.el.object3D.position;
                // Request path from backend
                let dm = document.querySelector('[disaster-manager]');
                if (dm && dm.components['disaster-manager']) {
                    dm.components['disaster-manager'].socket.emit('request_path', {
                        agent_id: this.el.object3D.uuid,
                        start: { x: currentPos.x, z: currentPos.z },
                        goal: { x: 10, z: 10 }
                    });
                }

                // Listen for path result (hacky hook into DM)
                if (dm) {
                    dm.components['disaster-manager'].socket.on('path_result', (data) => {
                        if (data.agent_id === this.el.object3D.uuid) {
                            this.currentPath = data.path;
                            this.pathIndex = 0;
                            this.waitingForPath = false;
                        }
                    });
                }
            }
            return;
        }

        // Follow path
        if (this.pathIndex < this.currentPath.length) {
            let target = this.currentPath[this.pathIndex];
            let targetVec = new THREE.Vector3(target.x, 0, target.z);
            let currentPos = this.el.object3D.position;

            let direction = targetVec.clone().sub(currentPos);
            if (direction.length() < 0.1) {
                this.pathIndex++;
                return;
            }

            direction.normalize();
            let moveStep = direction.multiplyScalar(this.data.speed * dt);
            this.el.object3D.position.add(moveStep);
        }

        // Visuals
        this.el.setAttribute('material', 'color', 'orange'); // Evacuating color
    },

    moveRandomly: function (dt) {
        let currentPos = this.el.getAttribute('position');

        // Simple bounds check
        if (currentPos.x > 10 || currentPos.x < -10) this.direction.x *= -1;
        if (currentPos.z > 10 || currentPos.z < -10) this.direction.z *= -1;

        let moveStep = this.direction.clone().multiplyScalar(this.data.speed * dt);
        this.el.object3D.position.add(moveStep);
    },

    updateState: function (newState) {
        this.data.state = newState;
        if (newState === 'panic') {
            this.el.setAttribute('material', 'color', 'red'); // Panic color
        }
    }
});
